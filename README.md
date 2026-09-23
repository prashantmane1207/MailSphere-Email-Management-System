# MailSphere – Email Management System

MailSphere is a full-stack email management application built with **Java Spring Boot** and **React**. It provides a web-based platform for managing emails, drafts, attachments, notifications, and real-time communication.

## 🚀 Project Overview

The application is divided into two main parts:

* **Backend:** Java Spring Boot REST API with Spring Data JPA, Hibernate, PostgreSQL, Spring Security, and WebSocket.
* **Frontend:** React application built using Vite.

The frontend communicates with the backend through REST APIs, while WebSocket is used for real-time communication and notifications.

## 🛠️ Technologies Used

### Backend

* Java 17
* Spring Boot
* Spring Web
* Spring Data JPA
* Hibernate / JPA
* Spring Security
* WebSocket
* PostgreSQL
* Maven
* Lombok

### Frontend

* React
* Vite
* JavaScript
* HTML
* CSS

## ✨ Features

* User registration and authentication
* OTP-based registration flow
* Email compose and send
* Draft email management
* Inbox management
* Starred emails
* Email notifications
* File attachment support
* Real-time WebSocket communication
* REST API based frontend-backend communication

## 🏗️ Project Architecture

The backend follows a layered architecture:

```text
Controller
    ↓
Service
    ↓
Repository / DAO
    ↓
Entity
    ↓
PostgreSQL Database
```

### Backend Layers

**Controller Layer**

* Handles HTTP requests
* Provides REST API endpoints
* Communicates with the service layer

**Service Layer**

* Contains business logic
* Processes application operations

**Repository / DAO Layer**

* Handles database operations
* Uses JPA/Hibernate for persistence

**Entity Layer**

* Represents database tables
* Uses JPA annotations for object-relational mapping

## 📂 Project Structure

```text
MailSphere-Email-Management-System/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## 🗄️ Database

The application uses **PostgreSQL** as the database and **Hibernate/JPA** for database persistence.

The project contains entities for functionality including:

* Users
* Mails
* Attachments
* Notifications

Database credentials should be configured locally and should not be committed to the repository.

## ▶️ How to Run

### 1. Clone the Repository

```bash
git clone https://github.com/prashantmane1207/MailSphere-Email-Management-System.git
```

Navigate into the project:

```bash
cd MailSphere-Email-Management-System
```

### 2. Run the Backend

Navigate to the backend:

```bash
cd backend
```

Run the Spring Boot application:

```bash
mvn spring-boot:run
```

If port `8080` is already in use, you can run the backend on port `8081`:

```powershell
mvn spring-boot:run "-Dspring-boot.run.arguments=--server.port=8081"
```

### 3. Run the Frontend

Open another terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Vite will display the local frontend URL in the terminal.

## 🔗 API Communication

The React frontend communicates with the Spring Boot backend using REST APIs.

The Vite development server is configured to proxy:

```text
/api
```

and:

```text
/ws
```

to the backend server.

## 🔐 Configuration

Before running the application, configure the required database and application properties for your local environment.

Do not commit sensitive information such as:

```text
Database passwords
API keys
Authentication secrets
Private credentials
Cloud database credentials
```

## 📌 Key Project Highlights

* Full-stack Java and React application
* RESTful API development
* Spring Boot backend
* Hibernate/JPA database integration
* PostgreSQL database
* Layered backend architecture
* Spring Security integration
* WebSocket real-time communication
* Email and draft management
* File attachment handling
* React + Vite frontend

## 👨‍💻 Author

**Prashant Mane**

GitHub:
https://github.com/prashantmane1207

