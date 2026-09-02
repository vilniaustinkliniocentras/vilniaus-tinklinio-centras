import { StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ContractBlock } from "@/lib/contracts/contract-document-types";

export const contractStyles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 10,
    lineHeight: 1.5,
    color: "#111827",
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 56,
    hyphenationCallback: (word: string) => [word],
  },
  title: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  date: {
    textAlign: "left",
    marginBottom: 4,
  },
  section: {
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  paragraph: {
    textAlign: "justify",
    marginBottom: 6,
  },
  paragraphBold: {
    textAlign: "justify",
    marginBottom: 6,
    fontWeight: "bold",
  },
  fieldValue: {
    marginBottom: 2,
    borderBottomWidth: 0.75,
    borderBottomColor: "#111827",
    paddingBottom: 2,
    minHeight: 14,
  },
  hint: {
    fontSize: 9,
    textAlign: "center",
    marginBottom: 8,
  },
  checkbox: {
    fontWeight: "bold",
    marginBottom: 6,
    marginLeft: 12,
  },
  bullet: {
    marginBottom: 6,
    marginLeft: 12,
  },
  columnsHeader: {
    flexDirection: "row",
    marginBottom: 4,
  },
  columnsRow: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "flex-end",
  },
  columnLeft: {
    width: "48%",
    paddingRight: 8,
  },
  columnRight: {
    width: "52%",
    paddingLeft: 8,
  },
  columnHeaderText: {
    fontWeight: "bold",
  },
  columnText: {
    fontSize: 10,
  },
  columnHint: {
    fontSize: 9,
    marginTop: 2,
    marginBottom: 6,
  },
  signatureLine: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#111827",
    minHeight: 14,
    marginBottom: 2,
  },
  signatureHint: {
    fontSize: 9,
    textAlign: "center",
  },
});

function Spacer({ height }: { height: number }) {
  return <View style={{ height }} />;
}

function renderBlock(block: ContractBlock, index: number) {
  switch (block.type) {
    case "title":
      return (
        <Text key={index} style={contractStyles.title}>
          {block.text}
        </Text>
      );
    case "date":
      return (
        <Text key={index} style={contractStyles.date}>
          {block.text}
        </Text>
      );
    case "section":
      return (
        <Text key={index} style={contractStyles.section}>
          {block.text}
        </Text>
      );
    case "paragraph":
      return (
        <Text
          key={index}
          style={block.bold ? contractStyles.paragraphBold : contractStyles.paragraph}
        >
          {block.text}
        </Text>
      );
    case "field":
      return (
        <View key={index}>
          <Text style={contractStyles.fieldValue}>{block.value}</Text>
          {block.hint ? <Text style={contractStyles.hint}>{block.hint}</Text> : null}
        </View>
      );
    case "hint":
      return (
        <Text key={index} style={contractStyles.hint}>
          {block.text}
        </Text>
      );
    case "checkbox":
      return (
        <Text key={index} style={contractStyles.checkbox}>
          {block.text}
        </Text>
      );
    case "bullet":
      return (
        <Text key={index} style={contractStyles.bullet}>
          {block.text}
        </Text>
      );
    case "spacer":
      return <Spacer key={index} height={block.height} />;
    case "columns-header":
      return (
        <View key={index} style={contractStyles.columnsHeader}>
          <View style={contractStyles.columnLeft}>
            <Text style={contractStyles.columnHeaderText}>{block.left}</Text>
          </View>
          <View style={contractStyles.columnRight}>
            <Text style={contractStyles.columnHeaderText}>{block.right}</Text>
          </View>
        </View>
      );
    case "columns-row":
      return (
        <View key={index}>
          <View style={contractStyles.columnsRow}>
            <View style={contractStyles.columnLeft}>
              <Text style={[contractStyles.columnText, contractStyles.fieldValue]}>
                {block.left}
              </Text>
            </View>
            <View style={contractStyles.columnRight}>
              <Text style={contractStyles.columnText}>{block.right}</Text>
            </View>
          </View>
          {block.leftHint ? (
            <View style={contractStyles.columnsRow}>
              <View style={contractStyles.columnLeft}>
                <Text style={contractStyles.columnHint}>{block.leftHint}</Text>
              </View>
              <View style={contractStyles.columnRight} />
            </View>
          ) : null}
        </View>
      );
    case "columns-single":
      return (
        <View key={index} style={contractStyles.columnsRow}>
          <View style={contractStyles.columnLeft} />
          <View style={contractStyles.columnRight}>
            <Text style={contractStyles.columnText}>{block.text}</Text>
          </View>
        </View>
      );
    case "signature-row":
      return (
        <View key={index} style={contractStyles.columnsRow}>
          <View style={contractStyles.columnLeft}>
            {block.left.startsWith("_") ? (
              <Text style={contractStyles.signatureLine}> </Text>
            ) : (
              <Text style={contractStyles.signatureHint}>{block.left}</Text>
            )}
          </View>
          <View style={contractStyles.columnRight}>
            {block.right.startsWith("_") ? (
              <Text style={contractStyles.signatureLine}> </Text>
            ) : (
              <Text style={contractStyles.signatureHint}>{block.right}</Text>
            )}
          </View>
        </View>
      );
    default:
      return null;
  }
}

export function ContractBlocks({ blocks }: { blocks: ContractBlock[] }) {
  return <>{blocks.map((block, index) => renderBlock(block, index))}</>;
}
