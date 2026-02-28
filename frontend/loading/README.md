# CredLink ZK Frontend

A Next.js-based frontend for the CredLink ZK lending platform with zero-knowledge credit scoring.

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/pixelparty1/Loading.git
cd Loading
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your contract addresses and configuration.

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Wagmi & Viem (Web3)
- Recharts (Data Visualization)
- React Query

## Project Structure

```
├── app/              # Next.js 14 app directory
├── components/       # React components
├── contexts/         # React contexts
├── hooks/            # Custom React hooks
├── lib/              # Utility libraries and configurations
└── public/           # Static assets
```

## License

MIT
