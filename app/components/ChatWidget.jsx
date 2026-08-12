"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import "./chatwidget.css";

const SESSION_KEY = "fruitbean_chat_session_id";
const OPENED_BEFORE_KEY = "fruitbean_chat_opened_before";
const POLL_MS = 4000;
const BACKGROUND_POLL_MS = 15000; // lighter polling while the widget is minimized
const POLL_FAILS_BEFORE_WARNING = 2;
const TYPING_ID = "__typing__";
const CLOSE_ANIM_MS = 220; // keep in sync with .chatwidget-panel--closing duration in chatwidget.css
const NEAR_BOTTOM_PX = 64;
const MOBILE_QUERY = "(max-width: 600px)";

const WELCOME_MESSAGE = {
	id: "__welcome__",
	role: "bot",
	text: "Hi! I'm Fruitbean's assistant. Looking to rent a printer, or have a question about our ink refill service?",
};

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

/* ─── Small inline icon set (no external deps, inherits currentColor) ─── */
function IconClose(props) {
	return (
		<svg viewBox="0 0 24 24" width="15" height="15" fill="none" aria-hidden="true" {...props}>
			<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
		</svg>
	);
}
function IconSend(props) {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" {...props}>
			<path
				d="M4 12L20 4L13 20L11 13L4 12Z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}
function IconChevronDown(props) {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true" {...props}>
			<path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
}
function IconRefresh(props) {
	return (
		<svg viewBox="0 0 24 24" width="13" height="13" fill="none" aria-hidden="true" {...props}>
			<path
				d="M4 4v5h5M20 20v-5h-5M4.5 15a8 8 0 0 0 14.1 3M19.5 9A8 8 0 0 0 5.4 6"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}
function IconWifiOff(props) {
	return (
		<svg viewBox="0 0 24 24" width="12" height="12" fill="none" aria-hidden="true" {...props}>
			<path
				d="M2 8.5C6 5 10 3.5 12 3.5s6 1.5 10 5M5 12c2.3-1.9 4.6-2.9 7-2.9s4.7 1 7 2.9M8.3 15.4a6 6 0 0 1 7.4 0M12 19h.01M2 2l20 20"
				stroke="currentColor"
				strokeWidth="1.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	);
}

export default function ChatWidget() {
	const [open, setOpen] = useState(false);
	const [closing, setClosing] = useState(false);
	const [ready, setReady] = useState(false);
	const [messages, setMessages] = useState([WELCOME_MESSAGE]);
	const [status, setStatus] = useState("ai"); // ai | awaiting_human | human | closed
	const [claimedByName, setClaimedByName] = useState(null);
	const [input, setInput] = useState("");
	const [sending, setSending] = useState(false);
	const [sendPulse, setSendPulse] = useState(false);
	const [connectionIssue, setConnectionIssue] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);
	const [hasOpenedBefore, setHasOpenedBefore] = useState(true); // assume true until checked, to avoid a flash of the nudge badge
	const [isNearBottom, setIsNearBottom] = useState(true);
	const [newMessageWaiting, setNewMessageWaiting] = useState(false);

	const sessionIdRef = useRef(null);
	const lastMessageIdRef = useRef(0);
	// Every server row we've ever rendered, so a poll that races with an
	// in-flight send (or vice versa) can't add the same message twice.
	const seenIdsRef = useRef(new Set());
	const pollRef = useRef(null);
	const backgroundPollRef = useRef(null);
	const pollFailCountRef = useRef(0);
	const sendingRef = useRef(false);
	// Mirrors `open` for use inside callbacks (poll/merge) that shouldn't
	// re-subscribe every time the panel opens or closes.
	const openRef = useRef(false);
	const closeTimeoutRef = useRef(null);
	const sendPulseTimeoutRef = useRef(null);
	const focusTimeoutRef = useRef(null);

	const scrollRef = useRef(null);
	const textareaRef = useRef(null);

	const live = isLiveStatus(status);
	const panelVisible = open || closing;

	useEffect(() => {
		sessionIdRef.current = getOrCreateSessionId();
		try {
			setHasOpenedBefore(localStorage.getItem(OPENED_BEFORE_KEY) === "1");
		} catch {
			setHasOpenedBefore(true);
		}
		return () => {
			if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
			if (sendPulseTimeoutRef.current) clearTimeout(sendPulseTimeoutRef.current);
			if (focusTimeoutRef.current) clearTimeout(focusTimeoutRef.current);
		};
	}, []);

	// On phones the panel becomes a full bottom sheet — lock background
	// scroll while it's up so the page underneath doesn't drift/rubber-band
	// behind it. Desktop's floating card never triggers this.
	useEffect(() => {
		if (typeof window === "undefined" || !window.matchMedia) return;
		const isMobile = window.matchMedia(MOBILE_QUERY).matches;
		if (!isMobile) return;
		document.body.style.overflow = panelVisible ? "hidden" : "";
		return () => {
			document.body.style.overflow = "";
		};
	}, [panelVisible]);

	// Smart auto-scroll: only snap to the newest message when the visitor is
	// already near the bottom (i.e. actively reading live). If they've
	// scrolled up to reread something, don't yank them away — just flag that
	// something new arrived so the "jump to latest" pill can appear.
	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		if (isNearBottom) {
			el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
			setNewMessageWaiting(false);
		} else {
			setNewMessageWaiting(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [messages]);

	// Reset scroll position + focus the composer whenever the panel opens.
	useEffect(() => {
		if (!open) return;
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
		setIsNearBottom(true);
		setNewMessageWaiting(false);
		focusTimeoutRef.current = setTimeout(() => textareaRef.current?.focus(), 260);
		return () => clearTimeout(focusTimeoutRef.current);
	}, [open]);

	useEffect(() => {
		const el = textareaRef.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = Math.min(el.scrollHeight, 100) + "px";
	}, [input]);

	useEffect(() => {
		sendingRef.current = sending;
	}, [sending]);

	function handleMessagesScroll() {
		const el = scrollRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		const near = distanceFromBottom < NEAR_BOTTOM_PX;
		setIsNearBottom(near);
		if (near) setNewMessageWaiting(false);
	}

	function scrollToBottom() {
		const el = scrollRef.current;
		if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
		setIsNearBottom(true);
		setNewMessageWaiting(false);
	}

	// Merges a batch of server rows into local state exactly once each,
	// regardless of whether they arrived via polling, a send response, or
	// the initial session load. `hideVisitor: true` skips re-rendering the
	// visitor's own row because it's already on screen as an optimistic
	// bubble — this should ONLY be passed by handleSend, right after it
	// added that bubble. Every other caller (initSession loading history,
	// polling) must show visitor rows normally, or the visitor's
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

		// If any of these arrived while the panel was minimized, they're
		// genuinely unread — count them so the toggle badge reflects reality
		// instead of a static placeholder.
		if (!openRef.current) {
			const fromOthers = fresh.filter((m) => m.sender_type !== "visitor").length;
			if (fromOthers) setUnreadCount((c) => c + fromOthers);
		}

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
	// `force` skips the "already ready" guard — used when starting a brand
	// new conversation after the previous one was closed, since `ready`
	// hasn't re-rendered as false yet at the moment this is called.
	async function initSession(force = false) {
		if ((ready && !force) || !sessionIdRef.current) return;
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
				if (data.messages.length > 0) {
					// Returning visitor with real history — show that, and
					// only that, so the generic greeting doesn't repeat
					// above a conversation that's already well underway.
					data.messages.forEach((m) => seenIdsRef.current.add(m.message_id));
					lastMessageIdRef.current = Math.max(
						lastMessageIdRef.current,
						...data.messages.map((m) => m.message_id)
					);
					setMessages(data.messages.map(toDisplayMessage));
				} else {
					setMessages([WELCOME_MESSAGE]);
				}
				pollFailCountRef.current = 0;
				setConnectionIssue(false);
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
		openRef.current = open;
		if (open) {
			setUnreadCount(0);
			try {
				localStorage.setItem(OPENED_BEFORE_KEY, "1");
			} catch {}
			setHasOpenedBefore(true);
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

	// While the widget is minimized, check in occasionally (much less often
	// than the open-panel poll) so a reply that arrives while the visitor is
	// away still shows up as a real unread count instead of nothing at all.
	useEffect(() => {
		if (!ready || open) return;
		backgroundPollRef.current = setInterval(poll, BACKGROUND_POLL_MS);
		return () => {
			if (backgroundPollRef.current) clearInterval(backgroundPollRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ready, open]);

	// Opens with a quick pop; closes with a matching shrink-and-fade instead
	// of vanishing instantly, so the widget feels like a physical object
	// rather than a toggled div.
	function openPanel() {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setClosing(false);
		setOpen(true);
	}
	function closePanel() {
		setClosing(true);
		closeTimeoutRef.current = setTimeout(() => {
			setOpen(false);
			setClosing(false);
			closeTimeoutRef.current = null;
		}, CLOSE_ANIM_MS);
	}

	async function handleSend(e, overrideText) {
		e?.preventDefault?.();

		const text = (overrideText ?? input).trim();
		if (!text || sending) return;

		setMessages((prev) => [...prev, { id: `__local_${Date.now()}__`, role: "user", text }]);
		if (overrideText === undefined) setInput("");
		setSending(true);
		sendingRef.current = true;
		setSendPulse(true);
		if (sendPulseTimeoutRef.current) clearTimeout(sendPulseTimeoutRef.current);
		sendPulseTimeoutRef.current = setTimeout(() => setSendPulse(false), 450);

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
			// Shown as a distinct system notice (not a fake "bot reply") so
			// it's clearly a delivery problem, with a one-tap way to retry
			// the exact message instead of having to retype it.
			setMessages((prev) => {
				const next = prev.filter((m) => m.id !== TYPING_ID);
				return [
					...next,
					{
						id: `__local_err_${Date.now()}__`,
						role: "system",
						text: err.message || "Couldn't send that message. Please check your connection.",
						retryText: text,
					},
				];
			});
		} finally {
			setSending(false);
			sendingRef.current = false;
		}
	}

	function retrySend(text, errorRowId) {
		setMessages((prev) => prev.filter((m) => m.id !== errorRowId));
		handleSend(undefined, text);
	}

	// A closed conversation is a dead end otherwise — the same session id
	// would keep resolving to the same closed thread forever. Retiring it
	// and minting a fresh one lets the visitor start clean with one tap.
	function startNewConversation() {
		try {
			localStorage.removeItem(SESSION_KEY);
		} catch {}
		sessionIdRef.current = getOrCreateSessionId();
		seenIdsRef.current = new Set();
		lastMessageIdRef.current = 0;
		pollFailCountRef.current = 0;
		setConnectionIssue(false);
		setStatus("ai");
		setClaimedByName(null);
		setMessages([WELCOME_MESSAGE]);
		setReady(false);
		initSession(true);
	}

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
			? "You're connected with our team — someone will reply shortly."
			: status === "human"
			? `You're chatting with ${claimedByName || "our team"}.`
			: null;

	const showNudge = !open && !live && (unreadCount > 0 || !hasOpenedBefore);

	return (
		<div className="chatwidget-root">
			{panelVisible && (
				<div
					className={`chatwidget-backdrop${closing ? " chatwidget-backdrop--closing" : ""}`}
					onClick={closePanel}
					aria-hidden="true"
				/>
			)}

			{panelVisible && (
				<div
					className={`chatwidget-panel${live ? " chatwidget-panel--live" : ""}${
						closing ? " chatwidget-panel--closing" : ""
					}`}
					role="dialog"
					aria-label={live ? "Fruitbean live support" : "Fruitbean chat assistant"}
				>
					<span className="chatwidget-grabber" aria-hidden="true"></span>

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
									{connectionIssue ? (
										<IconWifiOff className="chatwidget-reconnect-icon" />
									) : (
										<span className="chatwidget-online-dot" aria-hidden="true" />
									)}
									{headerSubtitle}
								</div>
							</div>
						</div>

						<button
							className="chatwidget-close"
							onClick={closePanel}
							aria-label="Close chat"
							title="Close chat"
						>
							<IconClose />
						</button>
					</div>

					{bannerText && <div className="chatwidget-banner">{bannerText}</div>}

					<div className="chatwidget-messages-wrap">
						<div
							className="chatwidget-messages"
							ref={scrollRef}
							onScroll={handleMessagesScroll}
							aria-live="polite"
							aria-atomic="false"
						>
							{messages.map((m) => {
								const isEmptyBotTyping = m.id === TYPING_ID;

								if (m.role === "system") {
									return (
										<div key={m.id} className="chatwidget-system-row">
											{m.text}
											{m.retryText && (
												<button
													type="button"
													className="chatwidget-retry-btn"
													onClick={() => retrySend(m.retryText, m.id)}
												>
													<IconRefresh /> Retry
												</button>
											)}
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
											className={`chatwidget-bubble chatwidget-bubble--${m.role}${
												isEmptyBotTyping ? " chatwidget-bubble--typing" : ""
											}`}
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

						{!isNearBottom && (
							<button
								type="button"
								className="chatwidget-scrolldown"
								onClick={scrollToBottom}
								aria-label="Scroll to latest message"
							>
								<IconChevronDown />
								{newMessageWaiting && <span className="chatwidget-scrolldown-dot" />}
							</button>
						)}
					</div>

					{status === "closed" && (
						<button
							type="button"
							className="chatwidget-newconvo-btn"
							onClick={startNewConversation}
						>
							<IconRefresh /> Start a new conversation
						</button>
					)}

					<form className="chatwidget-inputbar" onSubmit={handleSend}>
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
									? "This conversation has ended — start a new one above"
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
							className={`chatwidget-sendbtn${sendPulse ? " chatwidget-sendbtn--pulse" : ""}`}
							disabled={!input.trim() || sending || status === "closed"}
							aria-label="Send message"
						>
							<IconSend />
						</button>
					</form>
				</div>
			)}

			<button
				className={`chatwidget-toggle${live ? " chatwidget-toggle--live" : ""}${
					open ? " chatwidget-toggle--open" : ""
				}${showNudge ? " chatwidget-toggle--nudge" : ""}`}
				onClick={() => (open ? closePanel() : openPanel())}
				aria-label={open ? "Close chat" : "Open chat"}
				aria-expanded={open}
			>
				<span className="chatwidget-toggle-ring" aria-hidden="true"></span>
				<span className="chatwidget-toggle-iconwrap">
					<span className="chatwidget-toggle-icon chatwidget-toggle-icon--chat" aria-hidden="true">
						{live ? (
							<span className="chatwidget-liveavatar chatwidget-liveavatar--sm" aria-hidden="true">
								{claimedByName ? getInitials(claimedByName) : "🙋"}
							</span>
						) : (
							<span className="chatwidget-droplet chatwidget-droplet--lg" aria-hidden="true"></span>
						)}
					</span>
					<span className="chatwidget-toggle-icon chatwidget-toggle-icon--close" aria-hidden="true">
						<IconClose width="18" height="18" />
					</span>
				</span>

				{!open && live && <span className="chatwidget-toggle-livedot" aria-hidden="true" />}
				{!open && !live && unreadCount > 0 && (
					<span className="chatwidget-toggle-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
				)}
				{!open && !live && unreadCount === 0 && !hasOpenedBefore && (
					<span className="chatwidget-toggle-badge">1</span>
				)}
			</button>
		</div>
	);
}
