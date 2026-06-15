FROM jenkins/jenkins:lts-jdk17

USER root

# Install Docker CLI + curl
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    git \
  && rm -rf /var/lib/apt/lists/*

# Match host docker GID (124) so jenkins can access /var/run/docker.sock.
# groupmod changes the existing group's GID; groupadd handles the case it doesn't exist yet.
RUN if getent group docker; then groupmod -g 124 docker; else groupadd -g 124 docker; fi \
 && usermod -aG docker jenkins

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
