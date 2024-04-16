import subprocess

def main():
    """Run the test command transparently (as if it was in the same process).

    If an error occurs, exit with the corresponding return code.
    Prints all outputs to stdout.
    """
    command = "pytest --debug --cov=rigby --cov-report=term-missing --cov-report=html --cov-report=lcov --cov-config=pyproject.toml --full-trace -v -s".split()
    result = subprocess.run(command, capture_output=True)
    print(result.stdout.decode('utf8'), end='')
    print(result.stderr.decode('utf8'), end='')
    if result.returncode != 0:
        exit(code=result.returncode)

if __name__ == "__main__":
    main()