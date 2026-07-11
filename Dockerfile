# Stage 1: Build the Python backend application layer
FROM python:3.12-slim as backend-builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Stage 2: Establish the ultra-lightweight secure production runtime environment
FROM python:3.12-slim
WORKDIR /app
COPY --from=backend-builder /app .
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]