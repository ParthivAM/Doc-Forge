export default function StatusBadge({ status }: { status: string }) {
    const statusLower = status.toLowerCase()

    let bgColor = 'bg-gray-100'
    let textColor = 'text-gray-700'

    if (statusLower === 'issued' || statusLower === 'valid') {
        bgColor = 'bg-green-100'
        textColor = 'text-green-700'
    } else if (statusLower === 'pending') {
        bgColor = 'bg-amber-100'
        textColor = 'text-amber-700'
    } else if (statusLower === 'revoked') {
        bgColor = 'bg-red-100'
        textColor = 'text-red-700'
    } else if (statusLower === 'draft') {
        bgColor = 'bg-gray-100'
        textColor = 'text-gray-700'
    }

    return (
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${bgColor} ${textColor}`}>
            {status}
        </span>
    )
}
