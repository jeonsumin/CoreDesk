import {readMarkdownFile} from "@/lib/utils"

const policyVersionConfigs = [
    {
        '20260722': {
            effectiveDate: '2026/07/22',
            lastUpdated: '2026/07/23',
            ko_kr: '20260722/ko.md',
        }
    }
]


export const getAllPolicyVersions = () => {
    for (const content of policyVersionConfigs) {
        for (const [, data] of Object.entries(content)) {

            return readMarkdownFile(
                data.ko_kr,
                '(auth)/register',
                'Policy'
            )
        }
    }
}
