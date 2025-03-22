# ytAi

```
            __     ___     _ 
   __  __  / /_   /   |   (_)
  / / / / / __/  / /| |  / / 
 / /_/ / / /_   / ___ | / /  
 \__, /  \__/  /_/  |_|/_/   
/____/                       
```

`ytAi` is a command-line tool that helps you analyze yt videos using OpenAI.  
It downloads the video transcript, sends it to a pre-defined assistant, and stores the result locally on your machine in a Markdown file.

---

## 🚀 Features

This CLI tool offers the following capabilities:

- 🧠 Manage assistants (create/delete)
- 📥 Download transcripts from yt videos
- 🤖 Analyze transcripts using OpenAI assistants

---

## ⚡ Quickstart

To get started, create a `.env` file containing your OpenAI credentials and model settings.

**Example `.env` file:**

```env
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4o
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=1000
```

The CLI also expects a configuration directory located at `~/.ytGPT` by default.  
Inside this folder, you can define one or more assistants, each with its own instruction and user input files.

---

### 📁 Folder Structure

```
📁 .ytGPT
├── 📄 cred.env
└── 📁 assistants
    └── 📁 {{assistant_name}}
        ├── 📁 instruction
        │   └── 📝 instruction.txt
        └── 📁 user_input
            ├── 📝 {{user_name1}}.txt
            └── 📝 {{user_name2}}.txt
```

Once set up, you can link the CLI globally and start using it:

```bash
npm link
yt
```

---

## 🧪 CLI

```
📂 Manage Assistants
├── 🆕 Create Assistant
│   └── ⚠️ Must be properly stored in the correct folder structure
├── ❌ Delete Assistant
│   └── 🗑️ Removes the assistant from OpenAI

📂 Transcript
└── 📥 Download yt video transcripts

📂 Transcript and AI
└── 🤖 Download transcripts and analyze them using pre-defined assistants
```

---

## 📚 Table of Contents

- [ytAi](#ytai)
  - [🚀 Features](#-features)
  - [⚡ Quickstart](#-quickstart)
    - [📁 Folder Structure](#-folder-structure)
  - [🧪 CLI](#-cli)
  - [📚 Table of Contents](#-table-of-contents)
  - [📄 License](#-license)


## 📄 License

This project is licensed under the MIT License.  
See the [LICENSE](LICENSE) file for more information.