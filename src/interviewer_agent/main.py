#!/usr/bin/env python
import json
import os
import time
from typing import List, Dict
from pydantic import BaseModel
from crewai import LLM
from crewai.flow.flow import Flow, listen, start
from interviewer_agent.crews.interview_crew.interview_crew import InterviewCrew
from pypdf import PdfReader
from dotenv import load_dotenv 

load_dotenv() 

# Define our flow state tracking keys
class InterviewState(BaseModel):
    job_description: str = ""
    cv_text: str = ""
    candidate_name: str = "candidate"
    primary_questions_report: str = ""
    primary_answers: str = ""
    followup_questions_report: str = ""
    followup_answers: str = ""
    final_scorecard: str = ""


class InterviewFlow(Flow[InterviewState]):
    """Flow for creating a 4-agent automated interview system"""

    @start()
    def get_user_input(self):
        """step 1: Capture documents, extract text from CV PDFt"""

        raw_name = input("Please enter the candidate's full name :")
        self.state.candidate_name = raw_name.strip().replace(" ", "_").lower()
        # Get user input matching your preferred structure
        self.state.job_description = input("Please enter the job description: ")
        #new pdf extraction
        pdf_success = False
        while not pdf_success:
            cv_path = input("Please enter the path to the candidate's CV PDF file (e.g., path/to/resume.pdf): ")
            cv_path = cv_path.strip().strip("'\"") # Cleans up trailing quotes from drag-and-drop
            
            if not os.path.exists(cv_path):
                print(f"[ERROR]: The file path '{cv_path}' does not exist. Please try again.")
                continue
                
            try:
                print("[SYSTEM]: Initializing binary PDF text extraction stream...")
                reader = PdfReader(cv_path)
                extracted_text = ""
                
                # Loop through every single page in the PDF and extract characters
                for page in reader.pages:
                    text_content = page.extract_text()
                    if text_content:
                        extracted_text += text_content + "\n"
                
                if not extracted_text.strip():
                    print("[WARN]: Could not extract readable text. The PDF might be a scanned image.")
                    print("Please try a text-based PDF or verify your file formatting.")
                    continue
                    
                self.state.cv_text = extracted_text
                pdf_success = True
                print(f"[SYSTEM SUCCESS]: Successfully extracted {len(extracted_text)} characters from PDF.")

                print(self.state.cv_text)
                
            except Exception as e:
                print(f"[ERROR]: Failed to read the PDF file. Details: {e}")


        print("\n[SYSTEM]: User input received. Proceeding to question generation...\n")
        return self.state

    @listen(get_user_input)
    def generate_primary_questions(self):  
        """run crew 1: Generate primary interview questions based on the job description and CV"""
        print("[SYSTEM]: Generating primary questions via Crew 1...")

        
        time.sleep(3) # Safe rate-limit buffer break
        interview_crew = InterviewCrew()
        result = interview_crew.question_generation_crew().kickoff(inputs={
                "job_description": self.state.job_description,
                "cv_text": self.state.cv_text,
                "primary_answers": "Pending collection in the next step"
            })
        self.state.primary_questions_report = result.raw

        print(self.state.primary_questions_report)
      
        return self.state

    @listen(generate_primary_questions)
    def conduct_primary_interview(self):
        """collect candidate answers to the primary questions and run crew 2: Generate follow-up questions based on the candidate's answers"""
        print("--- [LIVE CANDIDATE RESPONSE PHASE: PRIMARY] ---")

        user_primary_input = ""
        while not user_primary_input.strip():
            user_primary_input = input("Please enter the candidate's answers to the primary questions: ")
        self.state.primary_answers = user_primary_input

        print("\n[SYSTEM]: Analyzing answers. Deploying Follow-Up Agent via Crew 2...")

        return self.state
    
    @listen(conduct_primary_interview)
    def generate_followup_questions(self):
        """run crew 2 and print out follow up questions"""
        print("--- [Analyzing answers.Deploying followup agent] ---")

        time.sleep(3) # Safe rate-limit buffer break
        inputs = {
            "cv_text": self.state.cv_text,
            "job_description": self.state.job_description,
            "primary_answers": self.state.primary_answers
        }

    
        
        result = InterviewCrew().followup_generation_crew().kickoff(inputs=inputs)
        self.state.followup_questions_report = result.raw

        print(self.state.followup_questions_report)
        return self.state

    @listen(generate_followup_questions)
    def conduct_followup_interview(self):
        """collect candidate answers to the follow-up questions safely"""
        print("--- [LIVE CANDIDATE RESPONSE PHASE: FOLLOW-UP] ---")

        user_followup_input = ""
        while not user_followup_input.strip():
            user_followup_input = input("Please enter the candidate's answers to the follow-up questions: ")

        
        self.state.followup_answers = user_followup_input

        print("\n[SYSTEM]: Follow-up answers captured. Moving to final evaluation...\n")
        return self.state
    
    @listen(conduct_followup_interview)
    def run_final_grading(self):
        """run crew 3: Generate final scorecard based on all inputs"""
        print("\n[SYSTEM]: Submitting complete transcript to the Grading Panel via Crew 3...")


        time.sleep(3)
        inputs = {
            "cv_text": self.state.cv_text,
            "job_description": self.state.job_description,
            "primary_questions_report": self.state.primary_questions_report,
            "primary_answers": self.state.primary_answers,
            "followup_questions_report": self.state.followup_questions_report,
            "followup_answers": self.state.followup_answers
        }

    
        result = InterviewCrew().final_grading_crew().kickoff(inputs=inputs)
        self.state.final_scorecard = result.raw
        return self.state
    
    @listen(run_final_grading)
    def save_and_display_scorecard(self):
        """save the final scorecard and display it to the user"""
        print("[SYSTEM]: Compiling scorecard documentation...")

        os.makedirs("output", exist_ok=True)

        file_name = f"{self.state.candidate_name}_assessment.md"
        output_path = os.path.join("output", file_name)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(self.state.final_scorecard)

        print(self.state.final_scorecard)
        print(f"[SYSTEM SUCCESS]: Final scorecard saved to {output_path}")
        return "process complete"


def kickoff():
    """Run the pipeline flow"""
    flow = InterviewFlow()
    flow.kickoff()
    print("\n=== Flow Complete ===")
    print("Your comprehensive assessment is ready in the output directory.")
    print("Open output/ to view it.")


def plot():
    """Force capture the chart data and save it directly into the project folder"""
    flow = InterviewFlow()
    
    # 1. Use the plot() command to get the raw HTML string contents from CrewAI
    html_content = flow.plot() 
    
    # 2. Force write that exact data string into a real file in your workspace
    output_filename = "interview_flow_chart.html"
    with open(output_filename, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"\n[SYSTEM SUCCESS]: Flow visualization map explicitly written to root folder!")
    print(f"File destination: {os.path.abspath(output_filename)}")


if __name__ == "__main__":
    kickoff()
    # plot()
