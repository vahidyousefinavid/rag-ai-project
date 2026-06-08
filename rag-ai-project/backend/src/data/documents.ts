import { Document } from "@langchain/core/documents";

export const docs = [
  new Document({
    pageContent:
      "Node.js is a JavaScript runtime environment built on Chrome's V8 engine. It allows developers to execute JavaScript on the server side and build scalable backend services. Node.js uses an event-driven, non-blocking I/O architecture which makes it very efficient for handling many concurrent connections such as APIs, chat systems, and streaming platforms.",
  }),

  new Document({
    pageContent:
      "Retrieval Augmented Generation, commonly called RAG, is a technique used in modern AI systems where a language model retrieves relevant information from a vector database before generating an answer. This improves factual accuracy and allows the system to use private or updated knowledge that the base model was never trained on.",
  }),

  new Document({
    pageContent:
      "Large Language Models (LLMs) such as GPT, LLaMA, and Qwen are deep neural networks trained on massive text datasets. These models learn statistical patterns in language and can perform tasks like translation, summarization, coding assistance, and conversational question answering.",
  }),

  new Document({
    pageContent:
      "Vector databases are designed to store embeddings, which are numerical representations of text, images, or other data. Instead of performing keyword matching like traditional databases, vector databases search for semantic similarity using mathematical distance functions such as cosine similarity.",
  }),

  new Document({
    pageContent:
      "Chroma is an open-source vector database designed specifically for AI applications. It allows developers to store embeddings and perform fast similarity searches. Chroma integrates easily with frameworks like LangChain and is often used in building RAG pipelines.",
  }),

  new Document({
    pageContent:
      "LangChain is a popular framework that helps developers build applications powered by large language models. It provides components for prompt templates, chains, agents, vector stores, memory systems, and document loaders.",
  }),

  new Document({
    pageContent:
      "Alice Johnson is a software engineer specializing in backend development and distributed systems. She has extensive experience building scalable microservices using Node.js, Docker, and Kubernetes. Alice is currently working on cloud infrastructure projects for large technology companies.",
  }),

  new Document({
    pageContent:
      "Michael Carter is a machine learning engineer who focuses on natural language processing and AI infrastructure. He works with large language models, vector databases, and retrieval systems to build intelligent assistants and document search engines.",
  }),

  new Document({
    pageContent:
      "Sarah Williams is a data scientist with expertise in data analysis, statistics, and predictive modeling. She frequently works with Python libraries such as Pandas, NumPy, and Scikit-learn to analyze large datasets and build machine learning pipelines.",
  }),

  new Document({
    pageContent:
      "David Thompson is a DevOps engineer responsible for maintaining cloud platforms and CI/CD pipelines. He works with tools like Kubernetes, Terraform, and GitHub Actions to automate deployment workflows and ensure reliable infrastructure.",
  }),

  new Document({
    pageContent:
      "Emily Rodriguez is a product manager working on AI-driven applications. She coordinates between engineering teams, designers, and stakeholders to define product requirements and ensure successful delivery of machine learning powered features.",
  }),

  new Document({
    pageContent:
      "Daniel Lee is a cybersecurity specialist who focuses on protecting software systems from vulnerabilities and attacks. He performs security audits, penetration testing, and implements authentication and encryption mechanisms.",
  }),

  new Document({
    pageContent:
      "Sophia Martinez is a researcher studying artificial intelligence and human-computer interaction. Her research focuses on how people interact with intelligent systems and how AI assistants can be designed to provide more helpful and trustworthy responses.",
  }),

  new Document({
    pageContent:
      "James Anderson is a full-stack developer who works with both frontend and backend technologies. He builds web applications using React, Node.js, and modern API architectures such as GraphQL and REST.",
  }),

  new Document({
    pageContent:
      "Olivia Brown is a technical writer who specializes in creating developer documentation for complex software systems. She writes guides, tutorials, and API documentation that help developers understand and use new technologies.",
  }),
];
