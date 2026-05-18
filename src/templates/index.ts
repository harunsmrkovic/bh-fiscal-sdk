import stampatifiskalniracun from "./stampatifiskalniracun";
import stampatireklamiraniracun from "./stampatireklamiraniracun";
import stampatiperiodicniizvjestaj from "./stampatiperiodicniizvjestaj";
import stampatidnevniizvjestaj from "./stampatidnevniizvjestaj";
import stampatipresjekstanja from "./stampatipresjekstanja";
import osnovneinformacije from "./osnovneinformacije";
import oididnevniizvjestaj from "./oididnevniizvjestaj";
import upisinadisplej2 from "./upisinadisplej2";
import cashmovement from "./cashmovement";

const templates: Record<string, string> = {
  stampatifiskalniracun,
  stampatireklamiraniracun,
  stampatiperiodicniizvjestaj,
  stampatidnevniizvjestaj,
  stampatipresjekstanja,
  osnovneinformacije,
  oididnevniizvjestaj,
  upisinadisplej2,
  cashmovement,
};

export default templates;
