import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  CAPACITY,
  applyMove,
  canMove,
  generateLevel,
  isNestComplete,
  isSolved,
  topGroupSize,
} from './src/game';

// O furnică desenată din cercuri (cap, piept, abdomen) + ochi
function Ant({ color, size }) {
  const s = size;
  return (
    <View style={[styles.ant, { width: s * 1.6, height: s }]}>
      <View style={[styles.antPart, { width: s * 0.55, height: s * 0.55, backgroundColor: color }]} />
      <View style={[styles.antPart, { width: s * 0.4, height: s * 0.4, backgroundColor: color, marginHorizontal: -2 }]} />
      <View style={[styles.antPart, { width: s * 0.5, height: s * 0.5, backgroundColor: color }]}>
        <View style={[styles.eye, { width: s * 0.14, height: s * 0.14, top: s * 0.1, right: s * 0.08 }]} />
      </View>
    </View>
  );
}

function Nest({ nest, index, selected, onPress, width, shake }) {
  const lift = useRef(new Animated.Value(0)).current;
  const group = selected ? topGroupSize(nest) : 0;
  const complete = isNestComplete(nest);
  const antSize = Math.min(width * 0.45, 34);

  useEffect(() => {
    Animated.spring(lift, { toValue: selected ? -18 : 0, useNativeDriver: true, friction: 5 }).start();
  }, [selected, lift]);

  const shakeX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] });

  return (
    <Pressable onPress={() => onPress(index)} style={{ margin: 6 }}>
      <Animated.View
        style={[
          styles.nest,
          { width, height: antSize * CAPACITY + 34 },
          complete && styles.nestComplete,
          selected && styles.nestSelected,
          { transform: [{ translateX: shakeX }] },
        ]}
      >
        <View style={styles.nestInner}>
          {nest.map((color, i) => {
            const isLifted = i >= nest.length - group;
            return (
              <Animated.View
                key={i}
                style={isLifted ? { transform: [{ translateY: lift }] } : null}
              >
                <Ant color={color} size={antSize} />
              </Animated.View>
            );
          })}
        </View>
        <View style={styles.nestHole} />
      </Animated.View>
      {complete && <Text style={styles.crown}>👑</Text>}
    </Pressable>
  );
}

export default function App() {
  const [level, setLevel] = useState(1);
  const [nests, setNests] = useState(() => generateLevel(1));
  const [initial, setInitial] = useState(nests);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [badNest, setBadNest] = useState(null);
  const shake = useRef(new Animated.Value(0)).current;
  const { width: screenW } = useWindowDimensions();

  const won = useMemo(() => isSolved(nests), [nests]);
  const perRow = nests.length <= 5 ? nests.length : Math.ceil(nests.length / 2);
  const nestW = Math.min(70, (Math.min(screenW, 480) - 24) / perRow - 12);

  const startLevel = (lv) => {
    const n = generateLevel(lv);
    setLevel(lv);
    setNests(n);
    setInitial(n);
    setHistory([]);
    setSelected(null);
  };

  const doShake = (i) => {
    setBadNest(i);
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 1, duration: 50, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start(() => setBadNest(null));
  };

  const onNestPress = (i) => {
    if (won) return;
    if (selected === null) {
      if (nests[i].length > 0 && !isNestComplete(nests[i])) setSelected(i);
      return;
    }
    if (selected === i) {
      setSelected(null);
      return;
    }
    if (canMove(nests, selected, i)) {
      setHistory((h) => [...h, nests]);
      setNests(applyMove(nests, selected, i).nests);
      setSelected(null);
    } else {
      doShake(i);
      setSelected(nests[i].length > 0 && !isNestComplete(nests[i]) ? i : null);
    }
  };

  const undo = () => {
    if (!history.length || won) return;
    setNests(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setSelected(null);
  };

  const restart = () => {
    setNests(initial);
    setHistory([]);
    setSelected(null);
  };

  const zero = useRef(new Animated.Value(0)).current;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.title}>🐜 Colonia de Furnicuțe</Text>
      <View style={styles.infoRow}>
        <Text style={styles.info}>Nivel {level}</Text>
        <Text style={styles.info}>Mutări: {history.length}</Text>
      </View>
      <Text style={styles.hint}>
        Atinge un mușuroi, apoi altul, ca să muți furnicile. Adună fiecare culoare într-un singur mușuroi!
      </Text>

      <View style={[styles.board, { maxWidth: 480 }]}>
        {nests.map((nest, i) => (
          <Nest
            key={i}
            index={i}
            nest={nest}
            width={nestW}
            selected={selected === i}
            onPress={onNestPress}
            shake={badNest === i ? shake : zero}
          />
        ))}
      </View>

      <View style={styles.buttons}>
        <Pressable style={[styles.btn, !history.length && styles.btnOff]} onPress={undo}>
          <Text style={styles.btnText}>↩ Înapoi</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={restart}>
          <Text style={styles.btnText}>⟳ Reîncepe</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={() => startLevel(level)}>
          <Text style={styles.btnText}>🎲 Alt nivel</Text>
        </Pressable>
      </View>

      {won && (
        <View style={styles.overlay}>
          <View style={styles.winCard}>
            <Text style={styles.winEmoji}>🎉</Text>
            <Text style={styles.winTitle}>Bravo!</Text>
            <Text style={styles.winText}>
              Ai terminat nivelul {level} în {history.length} mutări.
            </Text>
            <Pressable style={[styles.btn, styles.btnBig]} onPress={() => startLevel(level + 1)}>
              <Text style={styles.btnText}>Nivelul următor ➜</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#3b2a1a', alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#ffe8b0', marginTop: 10 },
  infoRow: { flexDirection: 'row', gap: 24, marginTop: 8 },
  info: { color: '#f5d9a0', fontSize: 16, fontWeight: '600' },
  hint: { color: '#c9a978', fontSize: 13, textAlign: 'center', marginHorizontal: 24, marginTop: 6 },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: 30,
    paddingHorizontal: 12,
  },
  nest: {
    backgroundColor: '#6b4a2b',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 3,
    borderColor: '#8a6440',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 6,
    overflow: 'visible',
  },
  nestSelected: { borderColor: '#ffe066' },
  nestComplete: { borderColor: '#7bd88f', backgroundColor: '#5a6b2b' },
  nestInner: { flexDirection: 'column-reverse', alignItems: 'center' },
  nestHole: {
    position: 'absolute',
    top: 8,
    width: 18,
    height: 10,
    borderRadius: 9,
    backgroundColor: '#2a1c0f',
  },
  crown: { position: 'absolute', top: -22, alignSelf: 'center', fontSize: 20 },
  ant: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  antPart: { borderRadius: 100, borderWidth: 1, borderColor: 'rgba(0,0,0,0.35)' },
  eye: { position: 'absolute', backgroundColor: '#fff', borderRadius: 10 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 34, flexWrap: 'wrap', justifyContent: 'center' },
  btn: { backgroundColor: '#c47a2c', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14 },
  btnOff: { opacity: 0.4 },
  btnBig: { marginTop: 16, paddingHorizontal: 26, paddingVertical: 14 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCard: { backgroundColor: '#fff4dc', borderRadius: 24, padding: 28, alignItems: 'center', width: 290 },
  winEmoji: { fontSize: 48 },
  winTitle: { fontSize: 30, fontWeight: '800', color: '#3b2a1a' },
  winText: { fontSize: 16, color: '#5a4630', textAlign: 'center', marginTop: 6 },
});
