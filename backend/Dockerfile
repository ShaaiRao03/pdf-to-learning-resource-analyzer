# Use official Python image
FROM python:3.11-slim

# Set work directory
WORKDIR /app

# Install system dependencies if needed
RUN apt-get update && apt-get install -y gcc

# Copy credentials  
# COPY credentials /app/credentials

# Copy the .env file into the container
# COPY .env /app/.env

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# Expose port (Cloud Run default is 8080)
EXPOSE 8080

# Run FastAPI app with uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]