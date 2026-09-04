// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title Flamelink
 * @dev Store and burn encrypted text secrets on BotChain
 */
contract Flamelink {
    struct Secret {
        string ciphertext;
        bool exists;
    }

    mapping(bytes32 => Secret) private secrets;

    event SecretStored(bytes32 indexed id, address indexed creator);
    event SecretBurned(bytes32 indexed id, address indexed burner);

    /**
     * @dev Store a new secret. Gas is paid by the creator.
     */
    function storeSecret(bytes32 id, string calldata ciphertext) external {
        require(!secrets[id].exists, "Secret ID already exists");
        secrets[id] = Secret({
            ciphertext: ciphertext,
            exists: true
        });
        emit SecretStored(id, msg.sender);
    }

    /**
     * @dev Retrieve a secret by ID.
     */
    function getSecret(bytes32 id) external view returns (string memory) {
        require(secrets[id].exists, "Secret not found or burned");
        return secrets[id].ciphertext;
    }

    /**
     * @dev Burn a secret, removing it from the blockchain state forever.
     * Note: Historical transaction data still exists on archive nodes, 
     * but the active state is deleted. Since the text is encrypted, 
     * the historical ciphertext is useless without the key.
     */
    function burnSecret(bytes32 id) external {
        require(secrets[id].exists, "Secret not found or already burned");
        delete secrets[id];
        emit SecretBurned(id, msg.sender);
    }
}
