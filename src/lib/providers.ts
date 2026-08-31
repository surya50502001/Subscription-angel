export interface ProviderConfig {
  providerId: string;
  name: string;
  category: string;
  cancellationMode: "automatic" | "assisted" | "guided";
  cancellationUrl: string;
  apiAvailable: boolean;
  verificationMethod: "statement_match" | "api_check" | "manual_confirm";
  notes: string;
  instructions: string;
}

export const PROVIDER_REGISTRY: Record<string, ProviderConfig> = {
  netflix: {
    providerId: "netflix",
    name: "Netflix",
    category: "entertainment",
    cancellationMode: "guided",
    cancellationUrl: "https://www.netflix.com/youraccount",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Requires direct customer interaction inside Netflix portal.",
    instructions: "Sign in to Netflix, go to your Account page, click the 'Cancel Membership' button, and follow the prompts to complete the cancellation."
  },
  spotify: {
    providerId: "spotify",
    name: "Spotify",
    category: "entertainment",
    cancellationMode: "guided",
    cancellationUrl: "https://www.spotify.com/account",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Requires standard user interface options on Spotify website.",
    instructions: "Log in to your Spotify account page, scroll down to your plan, click 'Change Plan', and click 'Cancel Premium'."
  },
  equinox: {
    providerId: "equinox",
    name: "Equinox Fitness",
    category: "fitness",
    cancellationMode: "assisted",
    cancellationUrl: "https://www.equinox.com/contactus",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Requires sending a formal cancellation request via their club manager contact portal.",
    instructions: "Equinox memberships must be cancelled by writing to club management, via certified mail, or through their contact form with 3-5 days advance notice."
  },
  hulu: {
    providerId: "hulu",
    name: "Hulu",
    category: "entertainment",
    cancellationMode: "guided",
    cancellationUrl: "https://www.hulu.com/account",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Cancel standard Hulu or Hulu + Live TV plan online.",
    instructions: "Log in to your Hulu account page, scroll to the 'Your Subscription' section, and click 'Cancel' next to your subscription status."
  },
  adobe: {
    providerId: "adobe",
    name: "Adobe",
    category: "productivity",
    cancellationMode: "guided",
    cancellationUrl: "https://account.adobe.com/plans",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Standard Adobe Creative Cloud user plan cancel flow.",
    instructions: "Sign in to Adobe Account, under 'My Plans' select 'Manage Plan' for the subscription you want to cancel, and click 'Cancel your plan'."
  },
  gym: {
    providerId: "gym",
    name: "Local Gym",
    category: "fitness",
    cancellationMode: "assisted",
    cancellationUrl: "https://www.google.com/search?q=how+to+cancel+gym+membership",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "General physical gym instructions requiring mail or physical visit.",
    instructions: "Most gyms require physical visits or certified mail. Provide them with your generated letter and request a signed receipt of cancellation."
  },
  comcast: {
    providerId: "comcast",
    name: "Comcast Xfinity",
    category: "utility",
    cancellationMode: "assisted",
    cancellationUrl: "https://www.xfinity.com/support/articles/cancel-my-xfinity-services",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Guided negotiation of Comcast billing/contract terms.",
    instructions: "Call Comcast support or visit an Xfinity Store with your generated negotiation/cancellation draft to request direct rate reduction or contract termination."
  },
  chatgpt: {
    providerId: "chatgpt",
    name: "ChatGPT Plus",
    category: "productivity",
    cancellationMode: "guided",
    cancellationUrl: "https://chatgpt.com",
    apiAvailable: false,
    verificationMethod: "statement_match",
    notes: "Requires canceling in OpenAI billing account interface.",
    instructions: "Open ChatGPT, click on your profile photo, select 'My Plan', then select 'Manage Subscription' and click 'Cancel Plan'."
  },
  subguardian_sandbox: {
    providerId: "subguardian_sandbox",
    name: "SubGuardian Sandbox",
    category: "productivity",
    cancellationMode: "automatic",
    cancellationUrl: "https://ais-dev-wrd4kpge6wkwiy7slit2bx-194408287495.asia-southeast1.run.app/api/sandbox/cancel",
    apiAvailable: true,
    verificationMethod: "api_check",
    notes: "Fully automated sandbox provider for integration testing.",
    instructions: "This subscription supports real-time automatic cancellation via SubGuardian secure sandbox integration API."
  }
};

export function getProvider(providerName: string): ProviderConfig {
  const norm = providerName.toLowerCase().replace(/[\s_-]/g, "");
  const key = Object.keys(PROVIDER_REGISTRY).find(k => {
    const kNorm = k.toLowerCase().replace(/[\s_-]/g, "");
    return norm.includes(kNorm) || kNorm.includes(norm);
  });
  if (!key) {
    return {
      providerId: "default",
      name: providerName,
      category: "other",
      cancellationMode: "guided",
      cancellationUrl: `https://www.google.com/search?q=how+to+cancel+${encodeURIComponent(providerName)}+subscription`,
      apiAvailable: false,
      verificationMethod: "statement_match",
      notes: "Default generic instruction set.",
      instructions: "Log in to the provider's website, look for billing/account options, or contact their billing support directly with our generated professional request letter."
    };
  }
  return PROVIDER_REGISTRY[key];
}
