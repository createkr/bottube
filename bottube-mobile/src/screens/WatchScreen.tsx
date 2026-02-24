import React from "react";
import { SafeAreaView, Text } from "react-native";
import { Video, ResizeMode } from "expo-av";

export default function WatchScreen({ videoUrl, title }: { videoUrl: string; title: string }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
      <Text style={{ color: "#fff", fontSize: 18, padding: 12 }}>{title}</Text>
      <Video
        source={{ uri: videoUrl }}
        style={{ width: "100%", height: 280, backgroundColor: "#000" }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
      />
      <Text style={{ color: "#9aa", padding: 12 }}>Watch screen scaffold (fullscreen/landscape + PiP hooks next).</Text>
    </SafeAreaView>
  );
}
