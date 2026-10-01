# Project Report: Coding Platform

## 3) Table of Contents

1. [Abstract](#4-abstract)
2. [Introduction](#5-introduction)
3. [Functional and Non-functional Requirements](#6-functional-and-non-functional-requirements)
4. [UML Diagrams and Database Design](#7-uml-diagrams-and-database-design)
5. [Implementation Detail](#8-implementation-detail)
6. [Testing](#9-testing)
7. [Screen-shots](#10-screen-shots)
8. [Conclusion](#11-conclusion)
9. [Limitation and Future Extension](#12-limitation-and-future-extension)
10. [Bibliography](#13-bibliography)

---

## 4) Abstract

The Coding Platform is a comprehensive web-based application designed to facilitate online code editing, execution, and learning. It provides an intuitive, real-time environment where users can write code in multiple programming languages, execute it instantly, and evaluate their problem-solving skills. The platform bridges the gap between theoretical learning and practical implementation by offering a seamless coding interface. Built using modern full-stack web technologies, it features secure user authentication, problem management, and performance tracking, making it an ideal tool for students, educators, and developers preparing for coding interviews.

---

## 5) Introduction

The Coding Platform is a robust online judge and interactive coding environment that enables users to practice algorithmic problems directly from their browsers without requiring any local development setup.

### Technology/Platform/Tools used
*   **Frontend (Client-side):** 
    *   **React** with **Vite** for rapid development and optimized builds.
    *   **TailwindCSS** for responsive and modern UI styling.
    *   **Monaco Editor** for providing a VS Code-like code editing experience in the browser.
    *   **Recharts** for data visualization (progress tracking).
*   **Backend (Server-side):**
    *   **Node.js & Express.js** for handling API requests and server logic.
    *   **JWT (JSON Web Tokens)** for secure user authentication and session management.
    *   **Bcrypt.js** for password hashing and security.
*   **Database:**
    *   **MongoDB (Mongoose)** for flexible, document-based data storage of users, problems, and submissions.
*   **Tools:**
    *   **Git & GitHub** for version control.
    *   **Nodemon** for backend development reloading.
    *   **Axios** for API communication between client and server.

---

## 6) Functional and Non-functional Requirements

### Functional Requirements
1.  **User Authentication:** Users can register, log in, and securely manage their sessions.
2.  **Code Editor:** A web-based code editor with syntax highlighting and multi-language support.
3.  **Code Execution:** Users can submit code, compile it, and view the output/results.
4.  **Problem Library:** A catalog of coding problems categorized by difficulty and topic.
5.  **User Profile & Dashboard:** Users can track their progress, view submission history, and analyze their performance.
6.  **Rate Limiting:** Security measures to prevent spamming and abuse of the code execution engine.

### Non-functional Requirements
1.  **Performance:** Code execution should return results within a few seconds. The UI must be highly responsive.
2.  **Scalability:** The architecture should support concurrent users submitting code simultaneously.
3.  **Security:** User passwords must be securely hashed. The code execution environment must be isolated to prevent malicious code from affecting the server.
4.  **Usability:** The interface should be intuitive, accessible, and responsive across various devices (desktop, tablet, mobile).
5.  **Reliability:** The platform should have high availability and handle compilation errors gracefully without crashing.

---

## 7) UML Diagrams and Database Design

*(Note: Please refer to the actual diagram files attached to your project submission. Below is a descriptive representation.)*

### Database Design (MongoDB Collections)
1.  **Users Collection:** `_id`, `username`, `email`, `passwordHash`, `role`, `createdAt`, `solvedProblems`
2.  **Problems Collection:** `_id`, `title`, `description`, `difficulty`, `testCases` (input/expected output), `tags`
3.  **Submissions Collection:** `_id`, `userId`, `problemId`, `code`, `language`, `status` (Accepted, Wrong Answer, Error), `timestamp`

### UML Use Case Diagram Description
*   **Actor:** User/Student
    *   Use Cases: Register, Login, View Problem List, Select Problem, Write Code, Submit Code, View Results, View Profile Dashboard.
*   **Actor:** Admin
    *   Use Cases: Add Problem, Edit Problem, Manage Users.

---

## 8) Implementation Detail

### i) Modules created and brief description of each module
1.  **Authentication Module:** Handles secure user registration and login using JWT and Bcrypt. Protects specific routes from unauthorized access.
2.  **Problem Management Module:** Responsible for fetching problem statements, lists, and details from the database and delivering them to the frontend.
3.  **Code Editor Module:** Integrates the Monaco Editor into the React application, managing state for user code input across different programming languages.
4.  **Execution Engine Module:** Receives the user's code, compiles/runs it, compares the output against expected test cases, and returns the verdict.
5.  **Dashboard/Analytics Module:** Aggregates user submission data to visualize progress and solved problems using Recharts.

### ii) Algorithm/Flowchart (Code Submission Flow)
1.  **Start:** User opens a problem page.
2.  **Input:** User writes code in the Monaco Editor and selects a language.
3.  **Action:** User clicks "Submit".
4.  **Process (Client):** Frontend sends HTTP POST request with code, language, and problem ID to the Backend.
5.  **Process (Server):** 
    *   Backend validates the request and user token.
    *   Backend fetches test cases for the specific problem ID.
    *   Code is sent to the execution environment.
6.  **Decision (Execution):** 
    *   *If syntax error:* Return Compilation Error.
    *   *If runtime error:* Return Runtime Error.
    *   *If successful execution:* Compare output with test case expected output.
        *   *Match:* Verdict = Accepted.
        *   *Mismatch:* Verdict = Wrong Answer.
7.  **Process (Database):** Save the submission record and verdict to the database.
8.  **Output:** Send the final verdict back to the frontend to display to the user.
9.  **End.**

---

## 9) Testing

### i) Testing Framework and Method Used
*   **Methodology:** Manual Testing and Component Testing.
*   **Frontend Tools:** React developer tools and browser DevTools for UI/UX debugging, responsive design checks, and state management verification.
*   **Backend Tools:** API endpoint testing (validating authentication, problem fetching, and code submission routes) using standard HTTP clients (e.g., Postman).

### ii) Test Cases Used
1.  **Test Case 1 (Authentication):**
    *   *Action:* Register with an already existing email.
    *   *Expected Result:* System throws an error "Email already in use".
2.  **Test Case 2 (Code Execution - Accepted):**
    *   *Action:* Submit the correct Python/JS solution for a problem.
    *   *Expected Result:* Output matches test cases; Status updates to "Accepted".
3.  **Test Case 3 (Code Execution - Compilation Error):**
    *   *Action:* Submit code missing a semicolon or with invalid syntax.
    *   *Expected Result:* System returns the compiler/syntax error trace.
4.  **Test Case 4 (Security - Rate Limiting):**
    *   *Action:* Send multiple code submission requests rapidly.
    *   *Expected Result:* Server rejects requests with HTTP 429 "Too Many Requests" (based on `express-rate-limit`).

---

## 10) Screen-shots

*(Note: Please insert your actual project screenshots here before final submission. Suggested screenshots include:)*
*   **Screenshot 1:** User Login/Registration Page.
*   **Screenshot 2:** Main Dashboard showing user progress charts.
*   **Screenshot 3:** Problem List/Catalog.
*   **Screenshot 4:** Code Editor interface (Problem Detail view) showing a successful code execution (Accepted).

---

## 11) Conclusion

The Coding Platform project successfully implements a fully functional online coding environment. Key functionalities achieved include secure user authentication, an interactive real-time code editor, and a reliable code execution engine that evaluates user submissions against predefined test cases. The platform efficiently tracks user progress and provides an intuitive, responsive interface suitable for practicing programming skills. By integrating modern technologies like React, Node.js, and MongoDB, the system delivers a smooth and performant user experience.

---

## 12) Limitation and Future Extension

### Limitations
*   **Resource Constraints:** Code execution relies heavily on server resources. Handling infinite loops or highly memory-intensive code from users can strain the server if isolation isn't perfectly sandboxed.
*   **Language Support:** Currently, the platform may only support a limited set of programming languages depending on the compiler environment setup.

### Future Extensions
*   **Multiplayer / Collaborative Coding:** Implementing real-time collaborative editing using WebSockets (similar to Google Docs for code).
*   **Contest System:** Adding a feature to host timed coding competitions with leaderboards and rankings.
*   **AI Code Assistant:** Integrating an AI tool to provide hints or explain compilation errors to beginners.
*   **Advanced Analytics:** Providing deeper insights into time and space complexity of user submissions.

---

## 13) Bibliography

1.  **React Documentation:** https://react.dev/
2.  **Vite Documentation:** https://vitejs.dev/
3.  **Node.js Official Documentation:** https://nodejs.org/en/docs/
4.  **Express.js Framework:** https://expressjs.com/
5.  **MongoDB / Mongoose Documentation:** https://mongoosejs.com/
6.  **Monaco Editor:** https://microsoft.github.io/monaco-editor/
7.  **Tailwind CSS:** https://tailwindcss.com/
