// Shows a useFlashMessage message: red for an error, green otherwise.
export function SaveMessage({ message, className }: { message: string; className?: string }) {
    if (!message) return null;
    return <p className={`text-sm ${className ? `${className} ` : ""}${message.startsWith("Error") ? "text-red-500" : "text-green-600"}`}>{message}</p>;
}
