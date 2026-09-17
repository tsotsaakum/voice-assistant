FROM python:3.11-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    LENTSWE_HOST=0.0.0.0 \
    LENTSWE_DEBUG=0 \
    STREAMLIT_BROWSER_GATHER_USAGE_STATS=false

COPY requirements-cloud.txt .
RUN pip install --no-cache-dir -r requirements-cloud.txt

COPY . .

EXPOSE 7000 8000 8501

CMD ["streamlit", "run", "streamlit_app.py", "--server.address", "0.0.0.0", "--server.port", "8501"]
