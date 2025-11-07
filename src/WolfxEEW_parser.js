// src/WolfxEEW_parser.js

/**
 * Wolfx EEW APIのJSONデータを解析し、JSONオブジェクトを生成する。
 * @param {object} data - Wolfx EEW APIから取得した一つの情報オブジェクト。
 * @returns {object} JSON形式の防災情報。
 */
function parseWolfxEEW(data) {
    // === 1. あなたのコードから抽出されたデータ（変数名そのまま利用） ===
    const eventID = data.EventID;
    const serial = data.Serial;
    const maxInt = data.MaxIntensity ?? "不明";
    const title = data.Title ?? "緊急地震速報";
    
    const isFinal = data.isFinal;
    const isCancel = data.isCancel;
    const isAssumption = data.isAssumption;
    
    const originDate = data.OriginTime ? new Date(data.OriginTime) : null;
    const originStr = "11月07日 13時40分"; // ※ 実際は util/formatter.js で変換を想定

    const hypocenter = data.Hypocenter ?? "震源地不明";
    const magnitude = data.Magunitude ?? "不明"; // JSONに合わせてタイポそのまま
    const depth = data.Depth ?? "不明";
    const warnAreas = data.WarnArea || [];

    // === 2. 元のコードのテンプレートに基づき全文を整形 (フルテキストの再現) ===
    let eewMessage = "";
    
    // Step2: Title
    eewMessage += `◆${title}◆`;

    // Step3: serial と isFinal
    const serialText = isFinal ? "#最終報" : `#第${serial}報`;
    eewMessage += `\n${serialText}`;

    // Step4: 取消報
    if (isCancel) {
      eewMessage += "\nこの緊急地震速報はキャンセルされました。";
      // 取消報の場合はここで本文が完成
    } else {
        // Step5: PLUM報
        if (isAssumption) eewMessage += "\nPLUM法による緊急地震速報";

        // Step6: 震源情報
        eewMessage += `\n\n発生時刻:${originStr}`;
        eewMessage += `\n${hypocenter} で地震が発生した模様です。`;
        eewMessage += `\n推定最大震度は${maxInt}で、マグニチュードは${magnitude}、震源の深さは${depth}kmと推定されます。`;

        // Step7: 警報対象地域チェック
        if (warnAreas.length > 0) {
            const chiikiList = warnAreas.map(a => a.Chiiki ?? a.chiiki).join("、");
            eewMessage += `\n\n【対象地域】\n${chiikiList}`;
        }
    }
    
    eewMessage += "\n\n出典：Wolfx EEW API";

    // === 3. 共通JSONフォーマットに整形 ===
    const reportTimeJST = originStr.slice(-5); // HH:mmを抜粋

    return {
        id: `${eventID}_${serial}`,
        report_type: "WolfxEEW",
        report_time: reportTimeJST,
        is_canceled: isCancel,
        
        list_summary: isCancel 
            ? "【EEW】取消報"
            : `【EEW ${isFinal ? '最終報' : `第${serial}報`}】${maxInt} ${hypocenter}`,
        full_text: eewMessage.trim(), // ★元のテンプレートを維持 ★

        // === 4. 地図表示などに必要な固有データ (structured_data) ===
        structured_data: {
            event_id: eventID,
            serial: serial,
            is_final: isFinal,
            is_assumption: isAssumption,
            max_intensity: maxInt,
            magnitude: parseFloat(magnitude) || null,
            depth_km: parseFloat(depth) || null,
            hypocenter: hypocenter,
            warn_areas: warnAreas.map(a => a.Chiiki ?? a.chiiki), // 地図色分けの基盤
        }
    };
}
