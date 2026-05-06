import { Image, StyleSheet, Text, View } from 'react-native';
import { API_URL } from '../api/config';
import { colors, radius } from './theme';

type AvatarProps = {
  label: string;
  imageUrl?: string | null;
  size?: number;
  accent?: 'sky' | 'coral' | 'lavender' | 'mint';
};

const accents = {
  sky: colors.sky,
  coral: colors.coral,
  lavender: colors.lavender,
  mint: colors.mint
};

export function Avatar({ label, imageUrl, size = 48, accent = 'coral' }: AvatarProps) {
  const resolvedImage = resolveImageUrl(imageUrl);
  return (
    <View style={[styles.ring, { width: size, height: size, borderRadius: size / 2, backgroundColor: accents[accent] }]}>
      <View style={[styles.inner, { width: size - 8, height: size - 8, borderRadius: radius.pill }]}>
        {resolvedImage ? (
          <Image source={{ uri: resolvedImage }} style={[styles.image, { width: size - 8, height: size - 8, borderRadius: radius.pill }]} />
        ) : (
          <Text style={[styles.text, { fontSize: Math.max(16, size * 0.38) }]}>{label.slice(0, 2)}</Text>
        )}
      </View>
    </View>
  );
}

function resolveImageUrl(imageUrl?: string | null) {
  if (!imageUrl) return null;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  return `${API_URL}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
}

const styles = StyleSheet.create({
  ring: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, overflow: 'hidden' },
  image: { resizeMode: 'cover' },
  text: { color: colors.ink, fontWeight: '900' }
});
