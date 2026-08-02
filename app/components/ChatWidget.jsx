"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import "./chatwidget.css";

const SESSION_KEY = "fruitbean_chat_session_id";
const POLL_MS = 4000;
const POLL_FAILS_BEFORE_WARNING = 2;
const TYPING_ID = "__typing__";

const isLiveStatus = (status) => status === "awaiting_human" || status === "human";

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

// Converts a DB row into the { id, role, text } shape the widget renders.
function toDisplayMessage(m) {
	if (m.sender_type === "visitor") return { id: m.message_id, role: "user", text: m.text };
	if (m.sender_type === "admin")
		return { id: m.message_id, role: "bot", text: m.text, from: m.sender_name || "Support" };
	if (m.sender_type === "system") return { id: m.message_id, role: "system", text: m.text };
	// 'ai'
	return { id: m.message_id, role: "bot", text: m.text };
}

function getInitials(name) {
	if (!name) return "FB";
	return name
		.trim()
		.split(/\s+/)
		.map((w) => w[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);
}

export default function ChatWidget() {
	const [open, setOpen] = useState(false);
	const [ready, setReady] = useState(false);
	const [messages, setMessages] = useState([
		{
			id: "__welcome__",
			role: "bot",
			text: "Hi! I'm Fruitbean's assistant. Looking to rent a printer, or have a question about our ink refill service?",
		},
	]);
	const [status, setStatus] = useState("ai"); // ai | awaiting_human | human | closed
	const [claimedByName, setClaimedByName] = useState(null);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [escalating, setEscalating] = useState(false);
	const [connectionIssue, setConnectionIssue] = useState(false);

	const sessionIdRef = useRef(null);
	const lastMessageIdRef = useRef(0);
	// Every server row we've ever rendered, so a poll that races with an
	// in-flight send (or vice versa) can't add the same message twice.
	const seenIdsRef = useRef(new Set());
	const pollRef = useRef(null);
	const pollFailCountRef = useRef(0);
	const sendingRef = useRef(false);

	const scrollRef = useRef(null);
	const textareaRef = useRef(null);

	const live = isLiveStatus(status);

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

	useEffect(() => {
		sendingRef.current = sending;
	}, [sending]);

	// Merges a batch of server rows into local state exactly once each,
	// regardless of whether they arrived via polling, a send response, or
	// the initial session load. `hideVisitor: true` skips re-rendering the
	// visitor's own row because it's already on screen as an optimistic
	// bubble — this should ONLY be passed by handleSend, right after it
	// added that bubble. Every other caller (initSession loading history,
	// polling, escalate) must show visitor rows normally, or the visitor's
	// own past messages disappear the moment the widget reloads its history.
	function mergeServerMessages(serverMessages, { hideVisitor = false } = {}) {
		if (!serverMessages?.length) return;

		const fresh = serverMessages.filter((m) => !seenIdsRef.current.has(m.message_id));
		if (!fresh.length) {
			lastMessageIdRef.current = Math.max(
				lastMessageIdRef.current,
				...serverMessages.map((m) => m.message_id)
			);
			return;
		}

		fresh.forEach((m) => seenIdsRef.current.add(m.message_id));
		lastMessageIdRef.current = Math.max(
			lastMessageIdRef.current,
			...fresh.map((m) => m.message_id)
		);

		const toShow = hideVisitor ? fresh.filter((m) => m.sender_type !== "visitor") : fresh;
		if (toShow.length) {
			setMessages((prev) => [...prev, ...toShow.map(toDisplayMessage)]);
		}
	}

	function applyServerState(conversation, serverMessages) {
		if (conversation) {
			setStatus(conversation.status);
			setClaimedByName(conversation.claimed_by_name || null);
		}
		mergeServerMessages(serverMessages);
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
				mergeServerMessages(data.messages);
			}
		} catch (err) {
			console.error("Failed to start chat session:", err);
		} finally {
			setReady(true);
		}
	}

	const poll = useCallback(async () => {
		if (!sessionIdRef.current || sendingRef.current) return;
		try {
			const res = await fetch(
				`/api/chat/messages?sessionId=${encodeURIComponent(
					sessionIdRef.current
				)}&afterId=${lastMessageIdRef.current}`
			);
			const data = await res.json();
			if (res.ok) {
				applyServerState(data.conversation, data.messages);
				pollFailCountRef.current = 0;
				setConnectionIssue(false);
			} else {
				throw new Error("poll failed");
			}
		} catch (err) {
			// A couple of missed polls isn't worth alarming anyone over — admin
			// replies just arrive a little late. Only surface it if it keeps
			// happening, so the visitor knows to refresh if needed.
			pollFailCountRef.current += 1;
			if (pollFailCountRef.current >= POLL_FAILS_BEFORE_WARNING) {
				setConnectionIssue(true);
			}
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

		setMessages((prev) => [...prev, { id: `__local_${Date.now()}__`, role: "user", text }]);
		setInput("");
		setSending(true);
		sendingRef.current = true;

		const waitingOnAi = status === "ai";
		if (waitingOnAi) {
			setMessages((prev) => [...prev, { id: TYPING_ID, role: "bot", text: "" }]);
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

			// Remove the typing indicator by its stable id — never by array
			// position, since a poll could have inserted a real message ahead
			// of it while this request was in flight.
			setMessages((prev) => prev.filter((m) => m.id !== TYPING_ID));

			if (data.conversation) {
				setStatus(data.conversation.status);
				setClaimedByName(data.conversation.claimed_by_name || null);
			}
			// The visitor's own row is already shown optimistically, so skip
			// re-rendering it here; everything else (ai/admin/system) gets
			// appended — deduped against anything a concurrent poll already
			// picked up.
			mergeServerMessages(data.messages, { hideVisitor: true });

			pollFailCountRef.current = 0;
			setConnectionIssue(false);
		} catch (err) {
			setMessages((prev) => {
				const next = prev.filter((m) => m.id !== TYPING_ID);
				return [
					...next,
					{
						id: `__local_err_${Date.now()}__`,
						role: "bot",
						text: `⚠️ ${err.message || "Sorry, I couldn't connect right now."}`,
					},
				];
			});
		} finally {
			setSending(false);
			sendingRef.current = false;
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

	const headerTitle = live
		? claimedByName
			? claimedByName
			: "Fruitbean Live Support"
		: "Fruitbean Assistant";

	const headerSubtitle = connectionIssue
		? "Reconnecting…"
		: status === "human"
		? `Chatting with ${claimedByName || "our team"}`
		: status === "awaiting_human"
		? "Connecting you to our team…"
		: status === "closed"
		? "Conversation ended"
		: "Usually replies in a minute";

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
					className={`chatwidget-panel${live ? " chatwidget-panel--live" : ""}`}
					role="dialog"
					aria-label={live ? "Fruitbean live support" : "Fruitbean chat assistant"}
				>
					<div className="chatwidget-header">
						<div className="chatwidget-header-info">
							{live ? (
								<span
									className="chatwidget-liveavatar chatwidget-liveavatar--sm"
									aria-hidden="true"
								>
									{claimedByName ? getInitials(claimedByName) : "🙋"}
								</span>
							) : (
								<span
									className="chatwidget-droplet chatwidget-droplet--sm"
									aria-hidden="true"
								></span>
							)}

							<div style={{ minWidth: 0 }}>
								<div className="chatwidget-title-row">
									<span className="chatwidget-title">{headerTitle}</span>
									{live && <span className="chatwidget-live-chip">LIVE</span>}
								</div>
								<div className="chatwidget-subtitle">
									{connectionIssue && <span className="chatwidget-reconnect-dot" />}
									{headerSubtitle}
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
						{messages.map((m) => {
							const isEmptyBotTyping = m.id === TYPING_ID;

							if (m.role === "system") {
								return (
									<div key={m.id} className="chatwidget-system-row">
										{m.text}
									</div>
								);
							}

							return (
								<div
									key={m.id}
									className={`chatwidget-row chatwidget-row--${m.role}`}
								>
									{m.role === "bot" &&
										(live ? (
											<span
												className="chatwidget-liveavatar chatwidget-liveavatar--xs"
												aria-hidden="true"
											>
												{getInitials(m.from)}
											</span>
										) : (
											<span
												className="chatwidget-droplet chatwidget-droplet--xs"
												aria-hidden="true"
											></span>
										))}

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
									: live
									? "Message our team…"
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
				className={`chatwidget-toggle${live ? " chatwidget-toggle--live" : ""}`}
				onClick={() => setOpen((o) => !o)}
				aria-label={open ? "Close chat" : "Open chat"}
			>
				{live ? (
					<span className="chatwidget-liveavatar chatwidget-liveavatar--sm" aria-hidden="true">
						{claimedByName ? getInitials(claimedByName) : "🙋"}
					</span>
				) : (
					<span
						className="chatwidget-droplet chatwidget-droplet--lg"
						aria-hidden="true"
					></span>
				)}

				{!open && live && <span className="chatwidget-toggle-livedot" aria-hidden="true" />}
				{!open && !live && <span className="chatwidget-toggle-badge">1</span>}
			</button>
		</div>
	);
}
