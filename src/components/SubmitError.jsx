export default function SubmitError({ message }) {
  if (!message) return null
  return (
    <div
      role="alert"
      style={{
        background: '#fef2f2',
        border: '1.5px solid #fecaca',
        borderRadius: '12px',
        padding: '12px 14px',
        fontSize: '13px',
        color: '#dc2626',
        fontWeight: 500,
        marginBottom: '12px',
        lineHeight: 1.45,
      }}
    >
      {message}
    </div>
  )
}
