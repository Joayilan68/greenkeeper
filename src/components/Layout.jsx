import BottomNav from "./BottomNav";
import AIAssistant from "./AIAssistant";
import { appShell } from "../lib/styles";

export default function Layout({ children }) {
  return (
    <div style={appShell}>
      {children}
      <BottomNav />
      <AIAssistant />
    </div>
  );
}
