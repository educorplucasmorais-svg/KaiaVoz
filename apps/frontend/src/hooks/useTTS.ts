import { useCallback, useEffect, useState } from "react";

export type TTSProvider = "browser" | "edge-tts" | "elevenlabs";

export type VoiceSettings = {
  voice: string;
  rate: string; // e.g., '+0%'
  pitch: string; // e.g., '+0Hz'
  provider?: TTSProvider;
};

const DEFAULTS: VoiceSettings = {
  voice: "pt-BR-FranciscaNeural",
  rate: "+0%",
  pitch: "+0Hz",
  provider: "browser",
};

const base = import.meta.env.VITE_API_URL || "";

export function useTTS() {
  const [settings, setSettings] = useState<VoiceSettings>(() => {
    try {
      const saved = localStorage.getItem("kaia.voice");
      return saved ? ({ ...DEFAULTS, ...JSON.parse(saved) } as VoiceSettings) : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [serverProvider, setServerProvider] = useState<TTSProvider | null>(null);
  const [loading, setLoading] = useState(false);

  const isValidProviderResponse = (json: unknown): json is { success: boolean; data?: { provider: string } } => {
    return typeof json === "object" && json !== null && "success" in json && typeof (json as { success: unknown }).success === "boolean";
  };

  useEffect(() => {
    fetch(`${base}/api/tts/provider`)
      .then((r) => r.json())
      .then((json: unknown) => {
        if (isValidProviderResponse(json) && json.success && json.data?.provider) {
          const provider = json.data.provider;
          if (provider === "elevenlabs" || provider === "edge-tts" || provider === "browser") {
            setServerProvider(provider);
          }
        }
      })
      .catch(() => {
        setServerProvider(null);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("kaia.voice", JSON.stringify(settings));
  }, [settings]);

  const speakWithServer = useCallback(
    async (text: string): Promise<boolean> => {
      const cleanup = (audioUrl: string) => {
        URL.revokeObjectURL(audioUrl);
        setLoading(false);
      };

      try {
        setLoading(true);
        const response = await fetch(`${base}/api/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: settings.voice,
            rate: settings.rate,
            pitch: settings.pitch,
          }),
        });

        if (!response.ok) {
          setLoading(false);
          return false;
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        return new Promise((resolve) => {
          audio.onended = () => {
            cleanup(audioUrl);
            resolve(true);
          };
          audio.onerror = () => {
            cleanup(audioUrl);
            resolve(false);
          };
          audio.play().catch(() => {
            cleanup(audioUrl);
            resolve(false);
          });
        });
      } catch {
        setLoading(false);
        return false;
      }
    },
    [settings]
  );

  const speakWithBrowser = useCallback(
    (text: string) => {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = "pt-BR";

      const ratePct = parseFloat(settings.rate.replace(/[+%]/g, "")) || 0;
      utter.rate = Math.max(0.5, Math.min(2, 1 + ratePct / 100));

      const pitchHz = parseFloat(settings.pitch.replace(/[+Hz]/g, ""));
      if (!Number.isNaN(pitchHz)) {
        const basePitch = 1;
        utter.pitch = Math.max(0, Math.min(2, basePitch + pitchHz / 10));
      }

      const availableVoices = synth.getVoices();
      const selectedVoice =
        availableVoices.find((v) => v.name === settings.voice) ||
        availableVoices.find((v) => v.lang === "pt-BR") ||
        availableVoices.find((v) => v.lang?.startsWith("pt"));
      if (selectedVoice) utter.voice = selectedVoice;

      utter.onerror = (e) => {
        console.error("[Kaia TTS] Erro ao falar:", e.error);
      };

      synth.speak(utter);
    },
    [settings]
  );

  const speak = useCallback(
    async (text: string) => {
      if (serverProvider && serverProvider !== "browser") {
        const success = await speakWithServer(text);
        if (success) return;
      }
      speakWithBrowser(text);
    },
    [serverProvider, speakWithServer, speakWithBrowser]
  );

  return {
    settings,
    setSettings,
    speak,
    serverProvider,
    loading,
    isElevenLabs: serverProvider === "elevenlabs",
  };
}
