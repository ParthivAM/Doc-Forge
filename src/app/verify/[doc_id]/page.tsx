export default async function VerifyPage({ params }: { params: { doc_id: string } }) {
    return (
        <div className="max-w-2xl mx-auto">
            <div className="card text-center">
                <div className="w-20 h-20 rounded-full bg-blue-50 mx-auto mb-6 flex items-center justify-center">
                    <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-medium mb-4">
                    Early Preview
                </div>
                <h1 className="text-2xl font-bold text-brand-text mb-2">Document Verification</h1>
                <p className="text-brand-mutedText mb-4">
                    This is an early preview system. Document validity verification is experimental.
                </p>
                <div className="text-left bg-brand-pillBg/20 rounded-2xl p-6 text-sm text-brand-mutedText">
                    <p className="mb-2"><strong>Document ID:</strong> {params.doc_id}</p>
                    <p>Verification features are currently under development and not available in this version.</p>
                </div>
            </div>
        </div>
    )
}
