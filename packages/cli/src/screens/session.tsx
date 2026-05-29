import { SessionShell } from "../components/session-shell";
import { apiClient } from "../lib/api-client";
import z from "zod";
import { BotMessage, ErrorMessage, UserMessage } from "../components/messages";
import { useLocation, useNavigate, useParams } from "react-router";
import { useToast } from "../providers/toast";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../lib/http-errors";

type SessionData = {
  id: string;
  messages: Array<{
    role: "USER" | "ERROR" | "BOT";
    content: string;
    model?: string;
  }>;
};

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>(
    (val) => val != null && typeof val === "object" && "id" in val,
  ),
});

function ChatMessage({ msg }: { msg: SessionData["messages"][number] }) {
  if (msg.role === "USER") {
    return <UserMessage message={msg.content} />;
  }

  if (msg.role === "ERROR") {
    return <ErrorMessage message={msg.content} />;
  }

  return <BotMessage content={msg.content} model={msg.model ?? ""} />;
}

export function Session() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    // Skip fetch if session was passed via location state
    if (prefetched) return;

    setSession(null);

    if (!id) return;

    const sessionsClient = apiClient.sessions;
    if (!sessionsClient) return;

    let ignore = false;
    const fetchSession = async () => {
      try {
        const res = await sessionsClient.$get({ param: { id } });
        if (ignore) return;
        if (!res.ok) throw new Error(await getErrorMessage(res));
        const resolved = (await res.json()) as SessionData;
        setSession(resolved);
      } catch (err) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message:
            err instanceof Error ? err.message : "Failed to load session",
        });
        navigate("/", { replace: true });
      }
    };

    fetchSession();
    return () => {
      ignore = true;
    };
  }, [id, prefetched, toast, navigate]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} inputDisabled loading />;
  }

  return (
    <SessionShell onSubmit={() => {}} inputDisabled>
      {session.messages.map((msg, index) => (
        <ChatMessage key={index} msg={msg} />
      ))}
    </SessionShell>
  );
}
