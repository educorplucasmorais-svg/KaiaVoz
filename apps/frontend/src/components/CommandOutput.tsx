interface Props {
  lines: string[]
}

export default function CommandOutput({ lines }: Props) {
  return (
    <pre className="bg-black/50 text-green-200 p-4 rounded-lg w-full max-w-3xl h-64 overflow-auto">
      {lines.length === 0 ? 'Output do comando aparecerá aqui...' : lines.join('')}
    </pre>
  )
}
