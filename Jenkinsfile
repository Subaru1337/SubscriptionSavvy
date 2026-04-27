pipeline {
    agent any

    stages {

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t subscriptionsavvy .'
            }
        }

        stage('Remove Old Container') {
            steps {
                bat 'docker rm -f subscriptionsavvy || exit 0'
            }
        }

        stage('Run Container') {
            steps {
                bat 'docker run -d -p 8081:80 --name subscriptionsavvy subscriptionsavvy'
            }
        }
    }
}
