import { defaultSavedPreset } from "./presets";

type SavedGraph = {
  name: string;
  path: string;
};

class ProjectStorage {
  readonly SAVED_GRAPHS_KEY = "saved-graphs";
  readonly AUTO_HIDE_POINTS_KEY = "auto-hide-points";
  readonly SNAP_TO_GRID_KEY = "snap-to-grid";
  readonly SNAP_TO_POINTS_KEY = "snap-to-points";
  readonly LAST_PATH_DRAWN_KEY = "last-path";
  readonly THEME_COLOR_KEY = "theme-color";

  get autoHidePoints(): boolean | undefined {
    const str = window.localStorage.getItem(this.AUTO_HIDE_POINTS_KEY);
    return typeof str === "string" && str === "true" ? true : undefined;
  }
  set autoHidePoints(value: boolean) {
    window.localStorage.setItem(this.AUTO_HIDE_POINTS_KEY, value.toString());
  }

  get snapToGrid(): boolean | undefined {
    const str = window.localStorage.getItem(this.SNAP_TO_GRID_KEY);
    return typeof str === "string" && str === "true" ? true : undefined;
  }
  set snapToGrid(value: boolean) {
    window.localStorage.setItem(this.SNAP_TO_GRID_KEY, value.toString());
  }

  get snapToPoints(): boolean | undefined {
    const str = window.localStorage.getItem(this.SNAP_TO_POINTS_KEY);
    return typeof str === "string" && str === "true" ? true : undefined;
  }
  set snapToPoints(value: boolean) {
    window.localStorage.setItem(this.SNAP_TO_POINTS_KEY, value.toString());
  }

  get lastPathDrawn(): string | undefined {
    const str = window.localStorage.getItem(this.LAST_PATH_DRAWN_KEY);
    return typeof str === "string" ? str : undefined;
  }
  set lastPathDrawn(value: string) {
    window.localStorage.setItem(this.LAST_PATH_DRAWN_KEY, value);
  }

  get themeColor(): string | undefined {
    const str = window.localStorage.getItem(this.THEME_COLOR_KEY);
    return typeof str === "string" ? str : undefined;
  }
  set themeColor(value: string) {
    window.localStorage.setItem(this.THEME_COLOR_KEY, value);
  }

  get savedGraphs(): SavedGraph[] {
    const str = window.localStorage.getItem(this.SAVED_GRAPHS_KEY);
    if (str === null) {
      window.localStorage.setItem(this.SAVED_GRAPHS_KEY, JSON.stringify(defaultSavedPreset));
      return defaultSavedPreset;
    }
    return JSON.parse(str);
  }

  saveGraph(name: string, pathStr: string) {
    const graphs = this.savedGraphs;

    // Edit
    const currentGraph = graphs.find(g => g.name === name);
    if (currentGraph) {
      currentGraph.path = pathStr;
      window.localStorage.setItem(this.SAVED_GRAPHS_KEY, JSON.stringify(graphs));
      return;
    }

    // Add
    graphs.push({ name, path: pathStr });
    window.localStorage.setItem(this.SAVED_GRAPHS_KEY, JSON.stringify(graphs));
  }

  deleteGraph(name: string) {
    const graphs = this.savedGraphs.filter(g => g.name !== name);
    window.localStorage.setItem(this.SAVED_GRAPHS_KEY, JSON.stringify(graphs));
  }
}

export const storage = new ProjectStorage();
