import "react"
declare module "react" {
  // Augment React's JSX namespace
  namespace JSX {
    interface IntrinsicElements {
      "engine-power": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        power?: number | string;
      };
      "engine-speed": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        speed?: number | string;
      };
      "distance-tracker": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        distance?: number | string;
      };
    }
  }
}