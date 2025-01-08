# Function Workflow Builder

A visual function workflow builder that allows users to connect and chain mathematical functions together. Built with Next.js, TypeScript, and Tailwind CSS.

## Features

- **Visual Function Chaining**: Drag and drop connections between functions to create a workflow
- **Interactive UI**:
  - Initial value input (x)
  - Multiple mathematical functions
  - Final output display (y)
- **Dynamic Connections**:
  - Smooth curved paths for diagonal connections
  - Semi-circular paths for aligned connections
  - Straight lines for terminal connections
- **Real-time Updates**: Connections update automatically as components move or resize

## Technical Stack

- **Framework**: Next.js
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **SVG**: Dynamic path generation for connections
- **State Management**: React useState and useCallback hooks

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/yourusername/function-workflow-builder.git
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Initial Value**: Set the starting value (x) in the orange input box
2. **Connect Functions**:
   - Click and drag from output points (right side) to input points (left side)
   - Functions can be connected in any order
3. **Final Output**: The result will be displayed in the green output box

## Project Structure

```
src/
├── components/
│   └── Workflow/
│       └── index.tsx      # Main workflow component
├── constants/
│   └── workflow.ts        # Constants and default values
├── types/
│   └── workflow.ts        # TypeScript interfaces
└── utils/
    └── workflow.ts        # Utility functions for path generation
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
