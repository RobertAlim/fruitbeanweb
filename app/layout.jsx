import './globals.css'
import ChatWidget from './components/ChatWidget'
import Toast from './components/Toast'
export const metadata = {
  title: 'Fruitbean Ink Refilling Station',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
        <ChatWidget />
        <Toast />
      </body>
    </html>
  )
}