FROM ngrok/ngrok:latest

USER root
COPY ngrok-entrypoint.sh /usr/local/bin/ngrok-entrypoint.sh
RUN chmod +x /usr/local/bin/ngrok-entrypoint.sh
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
USER ngrok

ENTRYPOINT ["/usr/local/bin/ngrok-entrypoint.sh"]
