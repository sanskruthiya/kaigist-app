# kAIgist

**AI-powered multi-persona discussion simulator**

kAIgist is a web application that simulates discussions between multiple AI personas with different perspectives, expertise, and personalities. Generate structured meeting notes from AI-driven debates on any topic.

🌐 **Live Site**: [https://kaigist.party071985.workers.dev/](https://kaigist.party071985.workers.dev/)

## Features

### Discussion Setup
- **Custom Themes**: Define any discussion topic with supplementary context
- **AI Personas**: Create diverse personas with configurable:
  - Name, age group, expertise
  - Stance (supportive/neutral/critical)
  - Personality traits
- **Discussion Formats**:
  - **Free Format**: Open-ended discussion
  - **Ranking**: Structured debate with final priority rankings
  - **Ideation**: Creative brainstorming with As-Is/To-Be analysis
- **Multiple LLM Support**: Choose from various AI models (GPT-4o, Claude, Gemini, etc.)

### Discussion Engine
- **Multi-round debates**: Configure the number of discussion rounds
- **Real-time streaming**: Watch AI personas debate in real-time
- **Facilitator intervention**: Pause and guide the discussion
- **Auto-resume**: Discussions automatically continue after facilitator input
- **Session persistence**: Save and resume discussions via JSON export/import

### Meeting Notes
- **Auto-generated summaries**: AI-powered structured meeting notes
- **Format-specific structure**: Notes adapt to discussion format (ranking, ideation, free)
- **Export options**: Download as Markdown or JSON
- **Multilingual**: Full support for Japanese and English

### UI/UX
- **Responsive design**: Works on desktop and mobile
- **Dark/light themes**: Comfortable viewing in any environment
- **Accessible navigation**: Hamburger menu on mobile, header navigation on desktop
- **Real-time cost tracking**: Monitor token usage and estimated API costs

## Tech Stack

- **Framework**: SvelteKit with TypeScript
- **Styling**: TailwindCSS
- **Icons**: Lucide Svelte
- **Deployment**: Cloudflare Workers
- **AI Integration**: Multiple LLM providers via unified API

## Development

Install dependencies:

```sh
npm install
```

Start development server:

```sh
npm run dev
```

Build for production:

```sh
npm run build
```

Preview production build:

```sh
npm run preview
```

## License

MIT
