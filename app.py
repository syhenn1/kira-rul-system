import subprocess
import sys
import os

if __name__ == "__main__":
    root = os.path.dirname(os.path.abspath(__file__))
    ai_dir = os.path.join(root, "kira-ai-engine")
    venv_python = os.path.join(ai_dir, "venv", "Scripts", "python.exe")

    python_exec = venv_python if os.path.exists(venv_python) else sys.executable
    subprocess.run([python_exec, "app.py"], cwd=ai_dir)
