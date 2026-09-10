import { config } from './config';
import { cleanMessages } from './preprocessing/cleaner';
import { segmentMessages } from './segmentation/segmenter';
import { computeTfidf } from './scoring/tfidf';
import { computeSimilarity } from './scoring/similarity';
import { buildSimilarityGraph } from './scoring/graph';
import { computeTextRank } from './scoring/textrank';
import { computeImportance } from './scoring/importance';
import { filterQuality } from './scoring/quality';
import { classifyStatementTypes } from './scoring/statementType';
import { assignCategories } from './scoring/categories';
import { removeRedundancy } from './scoring/redundancy';
import { orderChronologically } from './scoring/chronology';
import { formatContext } from './scoring/formatter';
import { CUES } from './scoring/cues';
import { ChatMessage } from '../shared/types';

export function extractWorkingContext(messages: ChatMessage[], customConfig?: any) {
  const activeConfig = customConfig || config;
  const cues = CUES;

  // Map to the internal expected structure with positions
  const engineMessages = messages.map((msg, index) => ({
    id: msg.id,
    role: (msg.role || 'user').toLowerCase(),
    text: msg.text,
    position: index + 1
  }));

  const cleaned = cleanMessages(engineMessages);
  const segmented = segmentMessages(cleaned.messages);
  const tfidf = computeTfidf(segmented);
  const similarity = computeSimilarity(tfidf);
  const graph = buildSimilarityGraph(similarity, activeConfig.graphSimilarityThreshold || 0.12);
  const textRank = computeTextRank(graph, segmented);
  const importance = computeImportance(textRank, tfidf, activeConfig, cues);
  const quality = filterQuality(importance, activeConfig);
  const statementType = classifyStatementTypes(quality, cues, activeConfig);
  const categories = assignCategories(statementType, cues);
  const redundancy = removeRedundancy(categories, similarity, activeConfig);
  const chronology = orderChronologically(redundancy);
  const formatter = formatContext(chronology);

  return {
    cleaned,
    segmented,
    tfidf,
    similarity,
    graph,
    textRank,
    importance,
    quality,
    statementType,
    categories,
    redundancy,
    chronology,
    formatter,
    formattedText: formatter.formattedText
  };
}
