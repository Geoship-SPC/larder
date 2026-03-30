# Stage 1: compile JSX → plain JS
FROM node:20-slim AS frontend-build
WORKDIR /build
COPY frontend/app.jsx .
COPY frontend/index.html .
RUN npm init -y && \
    npm install --save-dev @babel/core @babel/cli @babel/preset-react && \
    npx babel --presets @babel/preset-react app.jsx -o app.js && \
    HASH=$(md5sum app.js | cut -c1-8) && \
    sed -i "s/src=\"app\.js\"/src=\"app.js?v=${HASH}\"/" index.html

# Stage 2: app
FROM python:3.12-slim

RUN apt-get update && apt-get install -y nginx supervisor curl && rm -rf /var/lib/apt/lists/*

# Backend
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt
COPY backend/main.py .
COPY backend/app ./app

# Frontend
COPY frontend /usr/share/nginx/html
COPY --from=frontend-build /build/app.js /usr/share/nginx/html/app.js
COPY --from=frontend-build /build/index.html /usr/share/nginx/html/index.html
COPY configs/nginx.conf /etc/nginx/conf.d/default.conf
RUN rm /etc/nginx/sites-enabled/default 2>/dev/null || true

# Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80 8000

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
