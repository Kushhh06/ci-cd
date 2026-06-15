FROM jenkins/jenkins:lts-jdk17

USER root

# Install Docker CLI + curl
RUN apt-get update && apt-get install -y \
    docker.io \
    curl \
    git \
  && rm -rf /var/lib/apt/lists/*

# Match the host docker group GID so jenkins can access /var/run/docker.sock
RUN groupadd -f -g 124 docker && usermod -aG docker jenkins

USER jenkins

ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc

COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
