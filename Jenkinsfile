pipeline {
agent any
stages {
stage('Build Docker Image') {
.
steps {
bat 'docker build -t myapp .' ---- my app – put your github name
}
}
stage('Run Container') {
steps {
bat 'docker run -d -p 8080:80 myapp' ---- jenkins port 8080, port 80 – nginx (put your port)
}
}
}
}