FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
RUN python manage.py collectstatic --noinput || true
CMD ["gunicorn", "project.wsgi:application", "--bind", "0.0.0.0:8000"]
