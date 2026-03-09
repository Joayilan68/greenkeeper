import BottomNav from "./BottomNav";
import { appShell } from "../lib/styles";

export default function Layout({ children }) {
  return (
    <div style={appShell}>
      {children}
      <BottomNav />
    </div>
  );
}
