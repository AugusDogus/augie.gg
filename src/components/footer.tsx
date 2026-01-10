import {
  GithubLogo,
  TwitterLogo,
  LinkedinLogo,
  EnvelopeSimple,
  DiscordLogo,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const socialLinks = [
  {
    name: "GitHub",
    url: "https://github.com/AugusDogus",
    icon: GithubLogo,
  },
  {
    name: "Twitter",
    url: "https://twitter.com/AugusDogus",
    icon: TwitterLogo,
  },
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/in/augie-luebbers/",
    icon: LinkedinLogo,
  },
  {
    name: "Email",
    url: "mailto:hi@augie.gg",
    icon: EnvelopeSimple,
  },
  {
    name: "Discord",
    url: "https://discord.com/users/272225843626115072",
    icon: DiscordLogo,
  },
];

export function Footer() {
  return (
    <footer className="mt-6 text-center">
      <div className="flex justify-center gap-1">
        {socialLinks.map((link) => (
          <Tooltip key={link.name}>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.name}
                >
                  <link.icon className="size-5" />
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{link.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </footer>
  );
}
