"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import "./chatwidget.css";

const SESSION_KEY = "fruitbean_chat_session_id";
const POLL_MS = 4000;

function getOrCreateSessionId() {
	if (typeof window === "undefined") return null;
	let id = localStorage.getItem(SESSION_KEY);
	if (!id) {
		id =
			(window.crypto?.randomUUID && window.crypto.randomUUID()) ||
			`sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
		localStorage.setItem(SESSION_KEY, id);
	}
	return id;
}

// If the visitor happens to be a logged-in client, attach their identity so
// admins can see who they're chatting with.
function getKnownIdentity() {
	if (typeof window === "undefined") return {};
	try {
		const clientId = sessionStorage.getItem("client_id");
		const accountType = sessionStorage.getItem("account_type");
		const accountName = sessionStorage.getItem("account_name");
		const accountEmail = sessionStorage.getItem("account_email");
		if (clientId && accountType === "client") {
			return { clientId, visitorName: accountName, visitorEmail: accountEmail };
		}
	} catch {}
	return {};
}

// Converts a DB row into the { role, text } shape the widget already renders.
function toDisplayMessage(m) {
	if (m.sender_type === "visitor") return { role: "user", text: m.text };
	if (m.sender_type === "admin")
		return { role: "bot", text: m.text, from: m.sender_name || "Support" };
	if (m.sender_type === "system") return { role: "system", text: m.text };
	// 'ai'
	return { role: "bot", text: m.text };
}

export default function ChatWidget() {
	const [open, setOpen] = useState(false);
	const [ready, setReady] = useState(false);
	const [messages, setMessages] = useState([
		{
			role: "bot",
			text: "Hi! I'm Fruitbean's assistant. Looking to rent a printer, or have a question about our ink refill service?",
		},
	]);
	const [status, setStatus] = useState("ai"); // ai | awaiting_human | human | closed
	const [claimedByName, setClaimedByName] = useState(null);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [escalating, setEscalating] = useState(false);

	const sessionIdRef = useRef(null);
	const lastMessageIdRef = useRef(0);
	const pollRef = useRef(null);

	const scrollRef = useRef(null);
	const textareaRef = useRef(null);

	useEffect(() => {
		sessionIdRef.current = getOrCreateSessionId();
	}, []);

	useEffect(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [messages, open]);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = Math.min(el.scrollHeight, 100) + "px";
	}, [input]);

	function applyServerState(conversation, serverMessages) {
		if (conversation) {
			setStatus(conversation.status);
			setClaimedByName(conversation.claimed_by_name || null);
		}
		if (serverMessages?.length) {
			const mapped = serverMessages.map(toDisplayMessage);
			setMessages((prev) => [...prev, ...mapped]);
			lastMessageIdRef.current = serverMessages[serverMessages.length - 1].message_id;
		}
	}

	// Load (or resume) the conversation the first time the widget is opened.
	async function initSession() {
		if (ready || !sessionIdRef.current) return;
		try {
			const identity = getKnownIdentity();
			const res = await fetch("/api/chat/session", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId: sessionIdRef.current, ...identity }),
			});
			const data = await res.json();
			if (res.ok) {
				setStatus(data.conversation.status);
				setClaimedByName(data.conversation.claimed_by_name || null);
				if (data.messages?.length) {
					setMessages((prev) => [...prev, ...data.messages.map(toDisplayMessage)]);
					lastMessageIdRef.current = data.messages[data.messages.length - 1].message_id;
				}
			}
		} catch (err) {
			console.error("Failed to start chat session:", err);
		} finally {
			setReady(true);
		}
	}

	const poll = useCallback(async () => {
		if (!sessionIdRef.current) return;
		try {
			const res = await fetch(
				`/api/chat/messages?sessionId=${encodeURIComponent(
					sessionIdRef.current
				)}&afterId=${lastMessageIdRef.current}`
			);
			const data = await res.json();
			if (res.ok) applyServerState(data.conversation, data.messages);
		} catch (err) {
			// Silent — polling failures shouldn't interrupt the UI.
		}
	}, []);

	// Poll for admin replies while the widget is open, especially useful once
	// a human has taken over (their replies don't arrive via handleSend).
	useEffect(() => {
		if (open) {
			initSession();
			pollRef.current = setInterval(poll, POLL_MS);
		} else if (pollRef.current) {
			clearInterval(pollRef.current);
			pollRef.current = null;
		}
		return () => {
			if (pollRef.current) clearInterval(pollRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	async function handleSend(e) {
		e.preventDefault();

		const text = input.trim();
		if (!text || sending) return;

		setMessages((prev) => [...prev, { role: "user", text }]);
		setInput("");
		setSending(true);

		const waitingOnAi = status === "ai";
		if (waitingOnAi) {
			setMessages((prev) => [...prev, { role: "bot", text: "" }]);
		}

		try {
			const identity = getKnownIdentity();
			const res = await fetch("/api/chat/messages", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId: sessionIdRef.current, text, ...identity }),
			});

			if (!res.ok) {
				const errData = await res.json().catch(() => ({}));
				throw new Error(errData.error || `Request failed (${res.status})`);
			}

			const data = await res.json();

			// Replace the typing indicator (if any) with the real reply(ies).
			setMessages((prev) => (waitingOnAi ? prev.slice(0, -1) : prev));

			if (data.conversation) {
				setStatus(data.conversation.status);
				setClaimedByName(data.conversation.claimed_by_name || null);
			}
			if (data.messages?.length) {
				// Only append messages newer than what we already have (the
				// visitor message we optimistically added is already shown,
				// so skip re-adding sender_type === 'visitor' rows here).
				const newOnes = data.messages.filter((m) => m.sender_type !== "visitor");
				setMessages((prev) => [...prev, ...newOnes.map(toDisplayMessage)]);
				lastMessageIdRef.current = data.messages[data.messages.length - 1].message_id;
			}
		} catch (err) {
			setMessages((prev) => {
				const next = waitingOnAi ? prev.slice(0, -1) : prev;
				return [
					...next,
					{
						role: "bot",
						text: `⚠️ ${err.message || "Sorry, I couldn't connect right now."}`,
					},
				];
			});
		} finally {
			setSending(false);
		}
	}

	async function handleTalkToHuman() {
		if (escalating || status !== "ai") return;
		setEscalating(true);
		try {
			const identity = getKnownIdentity();
			const res = await fetch("/api/chat/escalate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sessionId: sessionIdRef.current, ...identity }),
			});
			const data = await res.json();
			if (res.ok) applyServerState(data.conversation, data.messages);
		} catch (err) {
			console.error("Failed to escalate:", err);
		} finally {
			setEscalating(false);
		}
	}

	const showTalkToHuman = status === "ai";
	const bannerText =
		status === "awaiting_human"
			? "🙋 You're connected with our team — someone will reply shortly."
			: status === "human"
			? `💬 You're chatting with ${claimedByName || "our team"}.`
			: null;

	return (
		<div className="chatwidget-root">
			{open && (
				<div
					className="chatwidget-panel"
					role="dialog"
					aria-label="Fruitbean chat assistant"
				>
					<div className="chatwidget-header">
						<div className="chatwidget-header-info">
							<span
								className="chatwidget-droplet chatwidget-droplet--sm"
								aria-hidden="true"
							></span>

							<div>
								<div className="chatwidget-title">
									Fruitbean Assistant
								</div>
								<div className="chatwidget-subtitle">
									{status === "human"
										? `Chatting with ${claimedByName || "our team"}`
										: status === "awaiting_human"
										? "Connecting you to our team…"
										: "Usually replies in a minute"}
								</div>
							</div>
						</div>

						<button
							className="chatwidget-close"
							onClick={() => setOpen(false)}
							aria-label="Close chat"
						>
							✕
						</button>
					</div>

					{bannerText && (
						<div className="chatwidget-banner">{bannerText}</div>
					)}

					<div className="chatwidget-messages" ref={scrollRef}>
						{messages.map((m, i) => {
							const isLast = i === messages.length - 1;
							const isEmptyBotTyping =
								m.role === "bot" &&
								m.text === "" &&
								isLast &&
								sending;

							if (m.role === "system") {
								return (
									<div key={i} className="chatwidget-system-row">
										{m.text}
									</div>
								);
							}

							return (
								<div
									key={i}
									className={`chatwidget-row chatwidget-row--${m.role}`}
								>
									{m.role === "bot" && (
										<span
											className="chatwidget-droplet chatwidget-droplet--xs"
											aria-hidden="true"
										></span>
									)}

									<div
										className={`chatwidget-bubble chatwidget-bubble--${m.role}`}
									>
										{m.from && (
											<div className="chatwidget-bubble-from">{m.from}</div>
										)}
										{isEmptyBotTyping ? (
											<span className="chatwidget-typing">
												<span></span>
												<span></span>
												<span></span>
											</span>
										) : (
											m.text
										)}
									</div>
								</div>
							);
						})}
					</div>

					{showTalkToHuman && (
						<button
							type="button"
							className="chatwidget-human-btn"
							onClick={handleTalkToHuman}
							disabled={escalating}
						>
							{escalating ? "Connecting…" : "🙋 Talk to a person"}
						</button>
					)}

					<form
						className="chatwidget-inputbar"
						onSubmit={handleSend}
					>
						<textarea
							ref={textareaRef}
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									handleSend(e);
								}
								// Shift+Enter inserts a newline
							}}
							placeholder={
								status === "closed"
									? "This conversation has ended…"
									: "Ask about renting a printer…"
							}
							aria-label="Type a message"
							rows={1}
							disabled={status === "closed"}
						/>

						<button
							type="submit"
							disabled={!input.trim() || sending || status === "closed"}
							aria-label="Send message"
						>
							➤
						</button>
					</form>
				</div>
			)}

			<button
				className="chatwidget-toggle"
				onClick={() => setOpen((o) => !o)}
				aria-label={open ? "Close chat" : "Open chat"}
			>
				<span
					className="chatwidget-droplet chatwidget-droplet--lg"
					aria-hidden="true"
				></span>

				{!open && (
					<span className="chatwidget-toggle-badge">1</span>
				)}
			</button>
		</div>
	);
}
