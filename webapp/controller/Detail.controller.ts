import type Router from "sap/ui/core/routing/Router";
import Base from "./Base.controller";
import type { Route$PatternMatchedEvent } from "sap/ui/core/routing/Route";

/**
 * @namespace base.controller
 */
export default class Detail extends Base {
  private router: Router;

  public override onInit(): void {
    this.router = this.getRouter();

    this.router.getRoute("detail")?.attachMatched(this.onRouteMatched);
  }

  private onRouteMatched = (event: Route$PatternMatchedEvent) => {
    const args = event.getParameter("arguments");

    console.log(args);
  };

  public override onExit(): void | undefined {
    this.router.getRoute("detail")?.detachMatched(this.onRouteMatched);
  }
}
