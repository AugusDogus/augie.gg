import { type ComponentProps, ViewTransition } from "react";
import { DEFAULT_APP_TITLE } from "~/lib/site";

/**
 * The name that home and the résumé both open with. It is one element to a
 * navigation between them, so it travels to its new place and size instead of
 * cutting (globals.css, `name-travel`). Its box must hug the text, or the
 * text would stretch on the way: give it `width: fit-content`.
 */
export function NameHeading(props: Omit<ComponentProps<"h1">, "children">) {
  return (
    <ViewTransition name="name" share="name-travel" default="none">
      <h1 {...props}>{DEFAULT_APP_TITLE}</h1>
    </ViewTransition>
  );
}
