import React, { useState } from "react";
import { Textarea } from "../../components/ui/textarea";
import { useGetUsername } from "../../hooks/use-getusername";
import { STREAMCHATURL } from "../../services/url";
import { UserChatSide } from "./user-chat-side";
import type { Message } from "./types";
import Markdown from 'react-markdown'

export const NewChat = () => {
    const username = useGetUsername();
    const [chatCurrentTextValue, setChatCurrentTextValue] = useState("");
    const [chatMessages, setChatMessages] = useState<Message[]>([]);

    const onKeyDown = async (e: React.KeyboardEvent) => {
        // check enter key is pressed and shift key is not pressed
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            // If chatText is empty, do not send the request
            if (!chatCurrentTextValue.trim()) return;

            try {
                const userMessage: Message = {
                    id: crypto.randomUUID(),
                    role: 'user',
                    content: chatCurrentTextValue,
                };
                setChatMessages(prev => [...prev, userMessage]);
                const response = await fetch(STREAMCHATURL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username,
                        message: chatCurrentTextValue,
                    }),
                });

                const reader = response.body?.getReader();
                const decoder = new TextDecoder("utf-8");

                if (!reader) {
                    console.error("Failed to get reader from response body");
                    return;
                }

                let buffer = "";

                setChatCurrentTextValue(""); // Clear input immediately
                const systemMessageId = crypto.randomUUID();
                setChatMessages((prev) => [
                    ...prev,
                    { id: systemMessageId, role: 'system', content: "" }
                ]);

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    let lines = buffer.split("\n");

                    // Keep last partial line in buffer
                    buffer = lines.pop() || "";

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith("data:")) {
                            const jsonPart = trimmed.replace(/^data:\s*/, "");
                            try {
                                const parsed = JSON.parse(jsonPart);
                                setChatMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === systemMessageId
                                            ? { ...msg, content: msg.content + parsed.token }
                                            : msg
                                    )
                                );
                            } catch (err) {
                                console.error("Error parsing JSON chunk:", err);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error sending message:", error);
            }
        }
    };


    const textareaSectionClassname = chatMessages?.length ? "flex flex-col items-center justify-end h-full w-full" : "flex flex-col items-center justify-center h-full w-full";

    return (
        <>
            {chatMessages.length > 0 && (
                <div className="w-full max-w-3xl mx-auto mb-4">
                    {chatMessages.map((msg) => (
                        <div
                            key={msg.id}
                        >
                            {msg.role === 'user'
                                ? <UserChatSide message={msg} />
                                : (
                                    <div className={`my-2 p-3 rounded-md text-left}`}>
                                        <Markdown>{msg.content}</Markdown>
                                    </div>
                                )
                            }
                        </div>
                    ))}
                </div>
            )}
            <section className={textareaSectionClassname}>
                <div className="new-chat w-full max-w-2xl">
                    {chatMessages.length > 0 ? null : (
                        <h2 className="text-lg font-semibold mb-4 text-center">
                            Good to see you, {username?.[0]?.toUpperCase()}
                            {username?.slice(1)}.
                        </h2>
                    )}
                    <div>
                        <Textarea
                            placeholder="Ask anything to Tintu :)."
                            className="rounded-lg w-full min-h-[100px] max-h-[200px]"
                            onChange={(e) => setChatCurrentTextValue(e.target.value)}
                            value={chatCurrentTextValue}
                            name="chatText"
                            onKeyDown={onKeyDown}
                        />
                    </div>
                </div>
            </section>
        </>
    );
};
