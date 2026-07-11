from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent
from typing import List
import os

# 1. Dynamically read all numbered Gemini API keys from the environment
API_KEYS = []
index = 1
while True:
    key = os.getenv(f"GEMINI_API_KEY_{index}")
    if not key:
        break
    API_KEYS.append(key)
    index += 1

# Fallback in case you still have the unnumbered GEMINI_API_KEY env variable
if not API_KEYS and os.getenv("GEMINI_API_KEY"):
    API_KEYS.append(os.getenv("GEMINI_API_KEY"))

# Global pointer to remember the last working key across your 3 distinct crews
current_key_index = 0


@CrewBase
class InterviewCrew():
    """Interview evaluation and scoring crew with automated key rotation"""

    agents: List[BaseAgent]
    tasks: List[Task]

    def __init__(self) -> None:
        if not API_KEYS:
            raise ValueError("No Gemini API keys found in your environment/.env configuration.")
            
        self._llm_instance = LLM(
            model="gemini/gemini-2.5-flash",
            temperature=0.2,
            api_key=API_KEYS[current_key_index]
        )
        
        # Initialize LiteLLM error rotation listeners immediately upon class instantiation
        self.configure_rotation_callbacks()

    def configure_rotation_callbacks(self):
        """Register failure hooks into LiteLLM to capture rate limits seamlessly"""
        import litellm
        
        def handle_litellm_error(exception):
            global current_key_index
            error_msg = str(exception)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg or "Quota" in error_msg or "503" in error_msg or "UNAVAILABLE" in error_msg:
                print(f"\n[Warning] Gemini Key Index {current_key_index} hit a cloud spike ({error_msg}). Rotating key...")
                current_key_index = (current_key_index + 1) % len(API_KEYS)
                
                self._llm_instance.api_key = API_KEYS[current_key_index]
                os.environ["GEMINI_API_KEY"] = API_KEYS[current_key_index]
                
        litellm.failure_callback = [handle_litellm_error]

    def update_and_fetch_llm(self) -> LLM:
        """Updates internal key matrices and forces Pylance reference tracking safety"""
        global current_key_index
        self._llm_instance.api_key = API_KEYS[current_key_index]
        os.environ["GEMINI_API_KEY"] = API_KEYS[current_key_index]
        return self._llm_instance

    @agent
    def cv_scanner(self) -> Agent:
        return Agent(
            config=self.agents_config['cv_scanner'], # type: ignore[index]
            llm=self.update_and_fetch_llm(),
            verbose=False
        )

    @agent
    def primary_interviewer(self) -> Agent:
        return Agent(
            config=self.agents_config['primary_interviewer'], # type: ignore[index]
            llm=self.update_and_fetch_llm(),
            verbose=False
        )

    @agent
    def followup_interviewer(self) -> Agent:
        return Agent(
            config=self.agents_config['followup_interviewer'], # type: ignore[index]
            llm=self.update_and_fetch_llm(),
            verbose=False
        )

    @agent
    def grading_panel(self) -> Agent:
        return Agent(
            config=self.agents_config['grading_panel'], # type: ignore[index]
            llm=self.update_and_fetch_llm(),
            verbose=False
        )

    # ==========================================
    # TASK COMPILATIONS
    # ==========================================

    @task
    def scan_task(self) -> Task:
        return Task(config=self.tasks_config['scan_task']) # type: ignore[index]

    @task
    def generate_questions_task(self) -> Task:
        return Task(
            config=self.tasks_config['generate_questions_task'], # type: ignore[index]
            context=[self.scan_task()] 
        )

    @task
    def followup_task(self) -> Task:
        return Task(config=self.tasks_config['followup_task']) # type: ignore[index]

    @task
    def score_task(self) -> Task:
        return Task(config=self.tasks_config['score_task']) # type: ignore[index]

    # ==========================================
    # THREE ISOLATED TEAMS (CREWS)
    # ==========================================

    @crew
    def question_generation_crew(self) -> Crew:
        """Crew 1: Scans CV and generates primary questions"""
        return Crew(
            agents=[self.cv_scanner(), self.primary_interviewer()],
            tasks=[self.scan_task(), self.generate_questions_task()],
            process=Process.sequential,
            verbose=False,
        )

    @crew
    def followup_generation_crew(self) -> Crew:
        """Crew 2: Evaluates primary answers and generates follow-ups"""
        return Crew(
            agents=[self.followup_interviewer()],
            tasks=[self.followup_task()],
            process=Process.sequential,
            verbose=False,
        )

    @crew
    def final_grading_crew(self) -> Crew:
        """Crew 3: Audits the complete conversation transcript and scores"""
        return Crew(
            agents=[self.grading_panel()],
            tasks=[self.score_task()],
            process=Process.sequential,
            verbose=False,
        )
