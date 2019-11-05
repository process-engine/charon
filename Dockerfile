ARG NODE_IMAGE_VERSION=

# Create base image
FROM node:${NODE_IMAGE_VERSION} as base

RUN apk update && apk upgrade && \
    apk add --no-cache tini python make g++ git supervisor

COPY Docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set Workdir
RUN mkdir bpmn-studio
WORKDIR /bpmn-studio

# Copy & extract tarball
COPY 'bpmn-studio.tar.gz' ./
RUN tar zxvf bpmn-studio.tar.gz && rm bpmn-studio.tar.gz

# Rebuild
RUN npm run electron-rebuild-sqlite-forced

# Install Studio
RUN npm link

# Install ProcessEngine
RUN cd node_modules/@process-engine/process_engine_runtime && npm link

EXPOSE 8000 9000
ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]

HEALTHCHECK --interval=5s \
            --timeout=5s \
            CMD curl -f http://127.0.0.1:9000 && curl -f http://127.0.0.1:8000 || exit 1

ARG BUILD_DATE
ARG BPMN_STUDIO_VERSION

LABEL de.5minds.version=${BPMN_STUDIO_VERSION} \
      de.5minds.release-date=${BUILD_DATE} \
      vendor="5Minds IT-Solutions GmbH & Co. KG" \
      maintainer="5Minds IT-Solutions GmbH & Co. KG"
