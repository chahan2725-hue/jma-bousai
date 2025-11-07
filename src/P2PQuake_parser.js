// src/P2PQuake_parser.js

// --- 補助関数群 ---
// ※ 実際は util/formatter.js に移動しますが、ここでは分かりやすさのため同梱

function depthToText(depth) {
  if (depth == null || depth < 0) return "不明";
  if (depth === 0) return "ごく浅い";
  return depth + "km";
}

function scaleToText(scale) {
  if (scale == null || scale < 0) return "不明";
  // P2P APIのスケールコードを震度テキストに変換
  const map = {10:'1',20:'2',30:'3',40:'4',45:'5弱',50:'5強',55:'6弱',60:'6強',70:'7'};
  return map[scale] || '不明';
}

function buildTsunamiText(domestic, foreign) {
  const d = domestic || "Unknown";
  const f = foreign || "";
  if (d==="Warning" || d==="Watch") return "津波に関する情報を発表しています。";
  if (d==="NonEffective") return "津波予報(若干の海面変動)を発表していますが、被害の心配はありません。";
  if (d==="None") {
    if (f==="Warning" || f==="Watch") return "この地震による国内での津波の心配はありません。";
    return "この地震による津波の心配はありません。";
  }
  if (d==="Checking") return "この地震による津波の有無を現在調査中です。";
  if (d==="Unknown") return "この地震による津波の有無は不明です。";
  return "津波情報：エラー！";
}

function compareScale(a, b) {
  const order = {'1':10,'2':20,'3':30,'4':40,'5弱':45,'5強':50,'6弱':55,'6強':60,'7':70};
  return (order[a]||0) - (order[b]||0);
}

function buildAreaText(points) {
    // あなたの元のコードのロジック（市町村ごとの震度情報を整形する複雑なロジック）を完全に再現
    // ...（中略）...
    // 【重要】元のコードの処理は非常に長いため、ここでは関数の存在のみを示します
    // 実際には、GitHub上であなたのコードのbuildAreaText関数全体を貼り付けてください
    return ""; 
}
// --------------------


/**
 * P2P地震情報APIのデータを解析し、JSONオブジェクトを生成する。
 * この関数は、ScalePrompt, Destination, DetailScale, Foreignの4タイプを処理する。
 * @param {object} item - P2P APIから取得した一つの地震情報オブジェクト。
 * @param {string} updateTime - 現在の更新時間 (yyyy/MM/dd HH:mm)。
 * @returns {object} JSON形式の防災情報。
 */
function parseP2PQuake(item, updateTime) {
    const eq = item.earthquake;
    const h = eq.hypocenter;
    const type = item.issue?.type || "Unknown";
    const place = h.name || "(発生地点不明)";
    const maxScaleText = scaleToText(eq.maxScale);
    const magnitudeText = (h.magnitude != null && h.magnitude >= 0) ? h.magnitude.toFixed(1) : "不明";
    const depthText = depthToText(h.depth);
    const tsunamiText = buildTsunamiText(eq.domesticTsunami, eq.foreignTsunami);
    const timeJST = "2025/11/07 01:23"; // ※ P2P APIのitem.earthquake.timeを整形することを想定
    
    // 長周期地震動・備考コメント
    const lfeText = (item.lfeClass != null && item.lfeClass >= 0) ? `\nまた、この地震について長周期地震動階級${item.lfeClass}を観測しています` : "";
    const commentText = (item.comments && item.comments.freeFormComment) ? `\n備考：${item.comments.freeFormComment.trim()}` : "";
    
    // 震度情報（地図色分け用データを含む）
    const intensityInfoText = (item.points && item.points.length > 0) ? buildAreaText(item.points) : "\n◁震度情報不明▷";
    
    let titlePrefix = "《地震情報》";
    let listSummaryPrefix = "【地震】";
    let fullText; // ★元のテンプレートを忠実に再現します★

    switch(type) {
        case "ScalePrompt":
            titlePrefix = "《震度速報》";
            listSummaryPrefix = "【速報】";
            fullText = `${titlePrefix}
${timeJST}
最大震度 ${maxScaleText}
${tsunamiText}

◆各地の震度(速報値)◆
${intensityInfoText}

出典：P2P地震情報API(気象庁)`;
            break;

        case "Destination":
            titlePrefix = "《震源速報》";
            listSummaryPrefix = "【震源】";
            fullText = `${titlePrefix}
${timeJST}
震源地 ${place}
マグニチュード ${magnitudeText}
深さ ${depthText}
${tsunamiText}

出典：P2P地震情報API(気象庁)`;
            break;

        case "DetailScale":
        case "Unknown":
        default:
            titlePrefix = "《地震情報》";
            listSummaryPrefix = "【詳細】";
            fullText = `${titlePrefix}
${timeJST}
震源地 ${place}
最大震度 ${maxScaleText}
マグニチュード ${magnitudeText}
深さ ${depthText}
${tsunamiText}${lfeText}${commentText}

◆各地の震度◆
${intensityInfoText}

出典：P2P地震情報API(気象庁)`;
            break;

        case "Foreign":
            titlePrefix = "《遠地地震情報》";
            listSummaryPrefix = "【遠地】";
            fullText = `${titlePrefix}
${timeJST}
震源地 ${place}
最大震度 ${maxScaleText}
マグニチュード ${magnitudeText}
深さ ${depthText}
${tsunamiText}

◆各地の震度◆
${intensityInfoText}

出典：P2P地震情報API(気象庁)`;
            break;
    }


    // === 共通JSONフォーマットに整形 ===
    return {
        id: `${item.id}_${type}`,
        report_type: type,
        report_time: timeJST.slice(-5), // HH:mmを抜粋
        is_canceled: false,
        
        list_summary: `${listSummaryPrefix} 震度${maxScaleText} ${place} M${magnitudeText}`,
        full_text: fullText.trim(), // ★元のテンプレートを維持 ★

        // === 地図表示などに必要な固有データ (structured_data) ===
        structured_data: {
            // マグニチュード、震度、震源地など、地図表示に必要な情報を抽出
            max_intensity: maxScaleText,
            magnitude: parseFloat(magnitudeText) || null,
            hypocenter_region: place,
            depth_km: parseFloat(h.depth) || null,
            // P2P APIのpointsデータは、そのまま地図の震度観測点として利用可能
            points: item.points || [], 
        }
    };
}
