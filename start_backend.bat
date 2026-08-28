@echo off
title Multi-Agent Product Advisor - FastAPI Backend
echo Starting FastAPI Backend on http://127.0.0.1:8000 ...
call venv\Scripts\activate.bat
uvicorn main:app --reload --host 127.0.0.1 --port 8000
pause
