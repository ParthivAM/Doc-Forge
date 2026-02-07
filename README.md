# Doc-Forge

**Document Generation and Verification Platform**

A full-stack web application that automates the creation, management, and verification of professional documents. Built to address the inefficiencies of manual document workflows in academic, corporate, and legal environments.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [Tech Stack](#tech-stack)
- [Application Flow](#application-flow)
- [Setup and Installation](#setup-and-installation)
- [Screenshots](#screenshots)
- [Use Cases](#use-cases)
- [Future Enhancements](#future-enhancements)
- [Disclaimer](#disclaimer)

---

## Project Overview

### The Problem

Organizations across industries rely heavily on documents such as certificates, offer letters, contracts, and reports. Creating these documents manually is time-consuming, prone to errors, and difficult to standardize. Verifying document authenticity is equally challenging, often requiring manual cross-referencing or physical verification.

### The Solution

Doc-Forge is a web-based platform that streamlines the entire document lifecycle. It enables users to generate professional documents from templates, compare document versions, apply digital signatures for authenticity, and leverage AI-powered analysis for intelligent document processing. The platform supports both PDF and Word file formats, making it adaptable to various organizational needs.

### Target Users

- Academic institutions issuing certificates and transcripts
- HR departments generating offer letters and experience certificates
- Legal teams drafting contracts and agreements
- Small businesses creating invoices, proposals, and reports

---

## Core Features

### Document Generation
- Create professional documents using pre-built templates
- Support for multiple document types including certificates, letters, reports, and contracts
- Customizable fields and dynamic content insertion

### File Format Support
- Generate documents in PDF format for distribution
- Export to Microsoft Word format for further editing
- Maintain consistent formatting across file types

### Document Comparison
- Compare two document versions side by side
- Highlight differences between documents
- Track changes and revisions effectively

### Digital Signature Support
- Apply digital signatures to documents
- Verify document authenticity through signature validation
- Maintain document integrity and non-repudiation

### Intelligent Document Processing
- AI-powered document analysis using Google Gemini API
- Extract key information from uploaded documents
- Generate document summaries and insights
- Rebuild and restructure documents based on AI recommendations

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React | User interface framework |
| TypeScript | Type-safe JavaScript development |
| Vite | Build tool and development server |
| CSS | Styling and responsive design |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express | API framework |
| Supabase | Database and authentication |

### APIs and Services
| Service | Purpose |
|---------|---------|
| Google Gemini API | AI-powered document analysis and processing |

### File Handling
| Library | Purpose |
|---------|---------|
| pdf-lib | PDF generation and manipulation |
| pdf-parse | PDF text extraction |
| docx | Microsoft Word document generation |

### Security
| Feature | Implementation |
|---------|----------------|
| Digital Signatures | Cryptographic signing and verification |
| Authentication | Supabase Auth |
| Data Validation | Server-side input validation |

---

## Application Flow

### 1. Document Creation

```
User selects template → Fills in required fields → Previews document → Generates output
```

1. The user selects a document template from the available options (certificate, offer letter, report, etc.)
2. The system presents a form with fields specific to the chosen template
3. The user enters the required information
4. A live preview displays the formatted document
5. The user generates the final document in their preferred format

### 2. File Generation

```
Template + User Data → Processing Engine → PDF/Word Output
```

1. The system combines the template structure with user-provided data
2. The processing engine formats the document according to template rules
3. The output is generated in the requested format (PDF or Word)
4. The file is available for download or further processing

### 3. Document Comparison

```
Upload Document A → Upload Document B → Analysis → Difference Report
```

1. The user uploads two documents for comparison
2. The system extracts text content from both documents
3. A comparison algorithm identifies differences
4. Results are displayed with highlighted changes

### 4. Digital Signature Application

```
Select Document → Apply Signature → Signed Document with Verification Data
```

1. The user selects a document to sign
2. The system generates a cryptographic signature
3. The signature is embedded in the document
4. Verification data is stored for future authenticity checks

### 5. AI-Powered Analysis

```
Upload Document → Gemini API Processing → Extracted Insights and Recommendations
```

1. The user uploads a document for analysis
2. The document is sent to the Gemini API
3. AI processes the content and extracts key information
4. Results include summaries, key points, and improvement suggestions

---

## Setup and Installation

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager
- Google Cloud account with Gemini API access
- Supabase account (for database and authentication)

### Installation Steps

1. **Clone the repository**

```bash
git clone https://github.com/ParthivAM/Doc-Forge.git
cd Doc-Forge
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key
```

4. **Set up the database**

Run the database migrations using the Supabase CLI or dashboard to create the required tables.

5. **Start the development server**

```bash
npm run dev
```

6. **Access the application**

Open your browser and navigate to `http://localhost:5173`

### Production Build

```bash
npm run build
npm run preview
```

---

## Screenshots

*Screenshots and demo links will be added here.*

| Screen | Description |
|--------|-------------|
| Dashboard | Main interface showing document management options |
| Template Selection | Available document templates |
| Document Editor | Form-based document creation interface |
| Comparison View | Side-by-side document comparison |
| AI Analysis | Document analysis results and insights |

---

## Use Cases

### Academic Institutions
- Generate completion certificates for courses and programs
- Create transcripts and grade reports
- Issue participation certificates for events and workshops

### Human Resources
- Generate offer letters for new hires
- Create experience letters for departing employees
- Produce employee verification documents

### Legal and Compliance
- Draft contract templates with customizable clauses
- Generate non-disclosure agreements
- Create policy documents and standard operating procedures

### Business Operations
- Generate invoices and quotations
- Create business proposals and reports
- Produce marketing briefs and financial summaries

---

## Future Enhancements

The following improvements are planned for future development:

### User Management
- Implement user authentication with role-based access control
- Add organization-level accounts with team management
- Create user activity logs and audit trails

### Storage and Integration
- Integrate cloud storage providers (Google Drive, Dropbox, OneDrive)
- Add document versioning and history
- Implement document sharing and collaboration features

### Advanced AI Capabilities
- Expand AI validation for document accuracy checking
- Add multi-language document support
- Implement automated template suggestions based on content

### Security Enhancements
- Add two-factor authentication
- Implement document encryption at rest
- Create detailed access control policies

### Workflow Automation
- Add document approval workflows
- Implement scheduled document generation
- Create batch processing for multiple documents

---

## Disclaimer

This project was developed for educational and demonstration purposes as part of a final-year Computer Engineering program. While the application implements functional document generation and verification features, it is not intended for production use in environments requiring certified digital signatures or legally binding document verification.

The digital signature implementation demonstrates cryptographic concepts but should not be considered equivalent to legally recognized electronic signature standards such as those defined by eIDAS or similar regulations.

---

## License

This project is available for educational purposes. See the LICENSE file for details.

---

## Contact

For questions or feedback regarding this project, please open an issue in the repository.
