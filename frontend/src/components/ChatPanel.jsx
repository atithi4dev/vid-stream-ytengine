import { useMemo, useState } from "react";
import UserAvatar from "./UserAvatar";
import { FaPaperclip, FaRegSmile, FaStickyNote } from "react-icons/fa";

const mockChats = [
  {
    id: "1",
    name: "Ayu Creator",
    avatar: "",
    lastMessage: "Did you watch the latest upload?",
    time: "2m",
    unread: 2,
    online: true,
    messages: [
      { id: "m1", fromMe: false, text: "Hey!", time: "10:21" },
      { id: "m2", fromMe: false, text: "Did you watch the latest upload?", time: "10:22" },
      { id: "m3", fromMe: true, text: "Yes, the editing was great 🔥", time: "10:23" },
    ],
  },
  {
    id: "2",
    name: "Tech Circle",
    avatar: "",
    lastMessage: "Schedule collab stream tonight.",
    time: "14m",
    unread: 0,
    online: false,
    messages: [
      { id: "m4", fromMe: false, text: "Schedule collab stream tonight.", time: "09:40" },
      { id: "m5", fromMe: true, text: "Sure, 9 PM works.", time: "09:42" },
    ],
  },
  {
    id: "3",
    name: "Gaming Squad",
    avatar: "",
    lastMessage: "Clip upload completed.",
    time: "1h",
    unread: 1,
    online: true,
    messages: [
      { id: "m6", fromMe: false, text: "Clip upload completed.", time: "08:15" },
      { id: "m7", fromMe: true, text: "Will share it in Dynamic.", time: "08:18" },
    ],
  },
];

export default function ChatPanel({ className = "", onClose }) {
  const [chats, setChats] = useState(mockChats);
  const [selectedChatId, setSelectedChatId] = useState(mockChats[0]?.id);
  const [mobileView, setMobileView] = useState("chat");
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [attachment, setAttachment] = useState(null);

  const emojiList = ["😀", "😂", "😍", "🔥", "👍", "🎉", "😎", "💯"];
  const stickerList = ["Nice!", "GG", "Wow", "LOL", "On it", "Great edit"];

  const selectedChat = useMemo(
    () => chats.find((chat) => chat.id === selectedChatId) || chats[0],
    [selectedChatId, chats]
  );

  const filteredChats = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return chats;
    return chats.filter((chat) => {
      return (
        chat.name.toLowerCase().includes(term) ||
        chat.lastMessage.toLowerCase().includes(term)
      );
    });
  }, [chats, search]);

  const suggestions = useMemo(() => filteredChats.slice(0, 6), [filteredChats]);

  const handleSelectChat = (chatId) => {
    setSelectedChatId(chatId);
    setMobileView("chat");
    setShowSuggestions(false);
  };

  const handleSend = (event) => {
    event.preventDefault();
    if (!draft.trim() && !attachment) return;

    const newMessage = {
      id: `m-${Date.now()}`,
      fromMe: true,
      text: draft.trim() || (attachment ? `📎 ${attachment.name}` : ""),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChats((prev) =>
      prev.map((chat) =>
        chat.id === selectedChatId
          ? {
              ...chat,
              messages: [...chat.messages, newMessage],
              lastMessage: newMessage.text,
              time: "now",
              unread: 0,
            }
          : chat
      )
    );

    setDraft("");
    setAttachment(null);
    setShowEmoji(false);
    setShowStickers(false);
  };

  return (
    <div className={`grid h-full min-h-0 grid-cols-1 gap-3 md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)] ${className}`}>
      <div className="flex items-center gap-2 md:hidden">
        <button
          onClick={() => setMobileView("list")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            mobileView === "list"
              ? "bg-red-600 text-white"
              : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setMobileView("chat")}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            mobileView === "chat"
              ? "bg-red-600 text-white"
              : "border border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
          }`}
        >
          Conversation
        </button>
      </div>

      <aside className={`min-h-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none ${mobileView === "chat" ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
        <div className="flex items-center justify-between px-2 pb-3">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Messages</h1>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Close
            </button>
          )}
        </div>

        <div className="relative mb-2 px-1">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              setTimeout(() => setShowSuggestions(false), 120);
            }}
            placeholder="Search chats..."
            className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />

          {showSuggestions && search.trim() && (
            <div className="thin-scrollbar absolute left-1 right-1 top-10 z-20 max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No matching users</p>
              ) : (
                suggestions.map((chat) => (
                  <button
                    key={chat.id}
                    type="button"
                    onClick={() => handleSelectChat(chat.id)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <UserAvatar src={chat.avatar} name={chat.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">{chat.name}</p>
                      <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{chat.lastMessage}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="thin-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto pb-2">
          {filteredChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => {
                handleSelectChat(chat.id);
              }}
              className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition ${
                chat.id === selectedChat.id ? "bg-red-50 dark:bg-red-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <div className="relative">
                <UserAvatar src={chat.avatar} name={chat.name} size="sm" />
                {chat.online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{chat.name}</p>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{chat.time}</span>
                </div>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{chat.lastMessage}</p>
              </div>
              {chat.unread > 0 && (
                <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">{chat.unread}</span>
              )}
            </button>
          ))}
        </div>
      </aside>

      <section className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-[0_6px_24px_rgba(15,23,42,0.04)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none ${mobileView === "list" ? "hidden md:flex" : "flex"}`}>
        <header className="shrink-0 flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <UserAvatar src={selectedChat.avatar} name={selectedChat.name} size="sm" />
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{selectedChat.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{selectedChat.online ? "Online" : "Offline"}</p>
          </div>
          <button
            onClick={() => setMobileView("list")}
            className="ml-auto rounded-lg border border-slate-300 px-2 py-1 text-[11px] text-slate-600 dark:border-slate-700 dark:text-slate-300 md:hidden"
          >
            Back
          </button>
        </header>

        <div className="thin-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {selectedChat.messages.map((message) => (
            <div key={message.id} className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                  message.fromMe
                    ? "bg-red-600 text-white rounded-br-md"
                    : "bg-slate-100 text-slate-700 rounded-bl-md dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                <p>{message.text}</p>
                <p className={`mt-1 text-[10px] ${message.fromMe ? "text-red-100" : "text-slate-400 dark:text-slate-500"}`}>{message.time}</p>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSend} className="shrink-0 border-t border-slate-200 p-3 dark:border-slate-700">
          {(showEmoji || showStickers) && (
            <div className="mb-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              {showEmoji && (
                <div className="flex flex-wrap gap-1">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setDraft((prev) => `${prev}${emoji}`)}
                      className="rounded-md px-2 py-1 text-base hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}

              {showStickers && (
                <div className="flex flex-wrap gap-2">
                  {stickerList.map((sticker) => (
                    <button
                      key={sticker}
                      type="button"
                      onClick={() => setDraft((prev) => `${prev}${prev ? " " : ""}[${sticker}]`)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs dark:border-slate-700"
                    >
                      {sticker}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {attachment && (
            <div className="mb-2 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Attached: {attachment.name}
            </div>
          )}

          <div className="flex flex-wrap gap-2 sm:flex-nowrap">
            <input
              id={`chat-file-${selectedChatId}`}
              type="file"
              className="hidden"
              onChange={(event) => setAttachment(event.target.files?.[0] || null)}
            />

            <button
              type="button"
              onClick={() => {
                setShowEmoji((prev) => !prev);
                setShowStickers(false);
              }}
              className="h-10 rounded-full border border-slate-300 px-3 text-slate-500 dark:border-slate-700 dark:text-slate-300"
              aria-label="Emoji"
            >
              <FaRegSmile />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowStickers((prev) => !prev);
                setShowEmoji(false);
              }}
              className="h-10 rounded-full border border-slate-300 px-3 text-slate-500 dark:border-slate-700 dark:text-slate-300"
              aria-label="Stickers"
            >
              <FaStickyNote />
            </button>

            <label
              htmlFor={`chat-file-${selectedChatId}`}
              className="flex h-10 cursor-pointer items-center rounded-full border border-slate-300 px-3 text-slate-500 dark:border-slate-700 dark:text-slate-300"
              aria-label="Attach file"
            >
              <FaPaperclip />
            </label>

            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
              className="h-10 min-w-0 flex-1 rounded-full border border-slate-300 px-4 text-sm outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
              type="submit"
              className="h-10 rounded-full bg-red-600 px-4 text-sm font-semibold text-white disabled:bg-slate-300"
              disabled={!draft.trim()}
            >
              Send
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
